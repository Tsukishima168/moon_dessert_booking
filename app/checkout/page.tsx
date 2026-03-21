'use client';

// 結帳頁不需要被搜尋引擎索引
// 注意: Client Components 不能直接導出 metadata,
// 需要在父層 layout 或 Server Component 中設定

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCartStore } from '@/store/cartStore';
import { CheckCircle, LogIn, MapPin, RefreshCw, Tag, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { TAIWAN_CITIES } from '@/lib/taiwan-data';
import { supabase } from '@/lib/supabase'; // Import Supabase
import { getResolvedUser } from '@/lib/client-auth';
import liff from '@line/liff';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

interface CheckoutFormData {
  customer_name: string;
  phone: string;
  email: string;
  delivery_method: 'pickup' | 'delivery';
  pickup_date: string;
  pickup_time: string;
  delivery_city?: string;          // 縣市
  delivery_district?: string;      // 區域
  delivery_address_detail?: string; // 詳細地址
  delivery_address?: string;       // 完整地址 (組合後)
  delivery_notes?: string;
  payment_date: string;
}

export default function CheckoutPage() {
  const {
    items,
    getTotalPrice,
    getFinalPrice,
    clearCart,
    promoCode,
    discountAmount,
    setPromoCode,
    clearPromoCode,
    normalizePrices,
  } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [confirmedName, setConfirmedName] = useState('');
  const [confirmedAmount, setConfirmedAmount] = useState(0);
  const [linePayUrl, setLinePayUrl] = useState('');
  const [savedItems, setSavedItems] = useState<Array<{ name: string; quantity: number; price: number }>>([]);
  const [isLinePayLoading, setIsLinePayLoading] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [availableDates, setAvailableDates] = useState<Record<string, { available: boolean; reason?: string }>>({});
  const [loadingDates, setLoadingDates] = useState(false);
  const [reservationRules, setReservationRules] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [dateValidation, setDateValidation] = useState<{ valid: boolean; reason: string } | null>(null);
  const [calendarDates, setCalendarDates] = useState<Array<{ date: string; label: string; dayName: string; disabled: boolean; reason: string }>>([]);

  // 地址選擇狀態
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const districts = useMemo(() => {
    return TAIWAN_CITIES.find(c => c.name === selectedCity)?.districts || [];
  }, [selectedCity]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    defaultValues: {
      delivery_method: 'pickup',
    },
  });

  // Auth State
  const [loggedInUser, setLoggedInUser] = useState<{ email: string; id: string } | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'guest'>('loading');
  const [authMessage, setAuthMessage] = useState('');

  // 從 API 載入用戶資料，metaName 為 OAuth provider 提供的名字（fallback）
  const loadUserProfile = async (email: string, metaName?: string) => {
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('載入會員資料失敗');

      const profile = await response.json();
      if (profile?.full_name) {
        setValue('customer_name', profile.full_name);
      } else if (metaName) {
        setValue('customer_name', metaName);
      }
      if (profile?.phone) setValue('phone', profile.phone);
      setValue('email', profile?.email || email);
      return;
    } catch {
      // ignore
    }
    if (metaName) setValue('customer_name', metaName);
    setValue('email', email);
  };

  const resolveCheckoutSession = async () => {
    try {
      setAuthStatus('loading');
      setAuthMessage('');

      const user = await getResolvedUser();
      if (!user) {
        setLoggedInUser(null);
        setAuthStatus('guest');
        setAuthMessage('尚未登入也可以下單；若要自動帶入會員資料，請先登入。');
        return;
      }

      const nextUser = { email: user.email || '', id: user.id };
      setLoggedInUser(nextUser);
      setAuthStatus('authenticated');
      setAuthMessage('會員資料已同步，姓名 / 電話 / Email 會自動帶入。');
      const metaName = (user.user_metadata?.full_name || user.user_metadata?.name) as string | undefined;
      await loadUserProfile(nextUser.email, metaName);
    } catch (error) {
      console.error('確認會員 session 失敗:', error);
      setLoggedInUser(null);
      setAuthStatus('guest');
      setAuthMessage('目前無法確認會員登入狀態，你仍可先手動下單。');
    }
  };

  useEffect(() => {
    void resolveCheckoutSession();

    // 2. 監聽 Auth 狀態變更
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const { id, email, user_metadata } = session.user;
        setLoggedInUser({ email: email || '', id });
        setAuthStatus('authenticated');
        setAuthMessage('會員資料已同步，姓名 / 電話 / Email 會自動帶入。');
        const metaName = (user_metadata?.full_name || user_metadata?.name) as string | undefined;
        void loadUserProfile(email || '', metaName);
      } else {
        setLoggedInUser(null);
        setAuthStatus('guest');
        setAuthMessage('尚未登入也可以下單；若要自動帶入會員資料，請先登入。');
      }
    });

    // 3. Initialize LINE LIFF
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (liffId) {
      liff.init({ liffId })
        .then(() => {
          if (liff.isLoggedIn()) {
            liff.getProfile()
              .then((profile) => {
                setValue('customer_name', profile.displayName);
              })
              .catch(err => console.error('LIFF getProfile Error:', err));
          }
        })
        .catch((err) => console.error('LIFF init Error:', err));
    }

    return () => subscription.unsubscribe();
  }, [setValue]);

  // 載入預訂規則
  useEffect(() => {
    const loadReservationRules = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          setReservationRules(settings.reservation_rules);
        }
      } catch (error) {
        console.error('載入預訂規則錯誤:', error);
      }
    };
    loadReservationRules();
  }, []);

  // 監聽取貨方式變化（必須在 useEffect 使用前宣告）
  const watchedDeliveryMethod = watch('delivery_method') as 'pickup' | 'delivery';
  useEffect(() => {
    setDeliveryMethod(watchedDeliveryMethod || 'pickup');
  }, [watchedDeliveryMethod]);

  // 產生格子日期列表（今天 + minDays 開始，顯示 30 天）
  useEffect(() => {
    const minDays = reservationRules?.min_advance_days || 3;
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const dates: typeof calendarDates = [];
    for (let i = minDays; i <= minDays + 29; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const day = d.getDay();
      let disabled = false;
      let reason = '';
      if (watchedDeliveryMethod === 'pickup' && day === 1) { disabled = true; reason = '週一公休'; }
      if (watchedDeliveryMethod === 'delivery' && (day === 0 || day === 1)) { disabled = true; reason = '不配送'; }
      const [, mm, dd] = dateStr.split('-');
      dates.push({ date: dateStr, label: `${mm}/${dd}`, dayName: dayNames[day], disabled, reason });
    }
    setCalendarDates(dates);
    // 若已選日期在新列表中已被禁用，清除
    if (selectedDate) {
      const found = dates.find(d => d.date === selectedDate);
      if (!found || found.disabled) {
        setSelectedDate('');
        setValue('pickup_date', '');
      }
    }
  }, [reservationRules, watchedDeliveryMethod]);

  const totalPrice = getTotalPrice();

  // 計算最早取貨日期 (Today + 3)
  const getMinPickupDate = () => {
    const date = new Date();
    const minDays = reservationRules?.min_advance_days || 3;
    date.setDate(date.getDate() + minDays);
    return date.toISOString().split('T')[0];
  };

  // 計算最晚取貨日期
  const getMaxPickupDate = () => {
    const date = new Date();
    const maxDays = reservationRules?.max_advance_days || 30;
    date.setDate(date.getDate() + maxDays);
    return date.toISOString().split('T')[0];
  };

  // 驗證選擇的日期
  const validateSelectedDate = async (dateStr: string) => {
    if (!dateStr) return;
    const date = new Date(dateStr);
    const day = date.getDay(); // 0 is Sunday, 1 is Monday

    // 1. 星期限制
    if (watchedDeliveryMethod === 'pickup') {
      // 自取: 鎖週一
      if (day === 1) {
        setDateValidation({ valid: false, reason: '週一公休無法自取' });
        return;
      }
    } else {
      // 宅配: 鎖週一、週日 (假設週日不配送)
      if (day === 1 || day === 0) {
        setDateValidation({ valid: false, reason: '宅配週日與週一無法到貨' });
        return;
      }
    }

    // 2. 產能與 API 驗證
    try {
      const capacityResponse = await fetch(`/api/check-capacity?date=${dateStr}&delivery_method=${watchedDeliveryMethod}`);
      if (capacityResponse.ok) {
        const capacity = await capacityResponse.json();
        if (!capacity.available) {
          setDateValidation({
            valid: false,
            reason: capacity.reason || '當日已達產能上限',
          });
          return;
        }
      }
      // 通過所有驗證
      setDateValidation({ valid: true, reason: '' });
    } catch (error) {
      console.error('驗證日期錯誤:', error);
    }
  };

  // 監聽日期變化
  const watchedPickupDate = watch('pickup_date');
  useEffect(() => {
    if (watchedPickupDate) {
      setSelectedDate(watchedPickupDate);
      validateSelectedDate(watchedPickupDate);
    }
  }, [watchedPickupDate, watchedDeliveryMethod]);

  // 運費計算
  const calculateDeliveryFee = (method: 'pickup' | 'delivery', subtotal: number): number => {
    if (method === 'pickup') return 0;
    if (subtotal >= 2000) return 0;
    return 150;
  };

  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const deliveryFee = calculateDeliveryFee(deliveryMethod, totalPrice);
  const finalPrice = getFinalPrice() + deliveryFee;

  const getAttribution = () => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('moonmoon_attribution') || '{}');
    } catch {
      return {};
    }
  };

  useEffect(() => {
    normalizePrices();
  }, [normalizePrices]);

  // 提交訂單
  const onSubmit = async (data: CheckoutFormData) => {
    if (dateValidation && !dateValidation.valid) {
      alert(dateValidation.reason);
      return;
    }

    setIsSubmitting(true);

    try {
      // 組合地址
      let finalAddress = null;
      if (data.delivery_method === 'delivery') {
        finalAddress = `${data.delivery_city}${data.delivery_district}${data.delivery_address_detail}`;
      } else {
        finalAddress = '月島甜點店 台南市安南區本原街一段97巷';
      }

      const attribution = getAttribution() as {
        from?: string | null;
        mbti?: string | null;
        utm_source?: string | null;
        utm_medium?: string | null;
        utm_campaign?: string | null;
        utm_content?: string | null;
        utm_term?: string | null;
        landing_url?: string | null;
      };

      const mbtiType = attribution?.mbti ? String(attribution.mbti) : null;
      const sourceFrom = attribution?.from ? String(attribution.from) : null;

      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: data.customer_name,
          phone: data.phone,
          email: data.email,
          pickup_time: data.pickup_date
            ? `${data.pickup_date} ${data.pickup_time || '12:00-13:00'}`
            : new Date().toISOString().split('T')[0] + ' 12:00-13:00',
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            variant_name: item.variant_name,
            price: item.price,
            quantity: item.quantity,
          })),
          total_price: finalPrice,
          promo_code: promoCode,
          discount_amount: discountAmount,
          original_price: totalPrice,
          final_price: finalPrice,
          delivery_method: data.delivery_method,
          delivery_address: finalAddress,
          delivery_fee: data.delivery_method === 'delivery' ? deliveryFee : 0,
          delivery_notes: data.delivery_notes,
          mbti_type: mbtiType,
          from_mbti_test: !!mbtiType,
          source_from: sourceFrom,
          utm_source: attribution?.utm_source || null,
          utm_medium: attribution?.utm_medium || null,
          utm_campaign: attribution?.utm_campaign || null,
          utm_content: attribution?.utm_content || null,
          utm_term: attribution?.utm_term || null,
          user_id: loggedInUser?.id || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const newOrderId = result.order_id;
        setOrderId(newOrderId);
        setConfirmedName(data.customer_name);
        setConfirmedAmount(finalPrice);
        setSavedItems(items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })));
        // 儲存姓名電話到 profile（登入用戶）
        if (loggedInUser?.id) {
          fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: data.customer_name,
              phone: data.phone,
            }),
          }).catch(() => { });
        }
        setOrderSuccess(true);
        clearCart();

        // 追蹤 GA4 purchase 事件
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'purchase', {
            transaction_id: newOrderId,
            value: finalPrice,
            currency: 'TWD',
            items: items.map(item => ({
              item_name: item.name,
              item_id: item.id,
              price: item.price,
              quantity: item.quantity,
              item_variant: item.variant_name || '單一規格',
            }))
          });
        }

        // 6. Build LINE message with payment info (Referencing moon_map_original)
        let msg = `【月島甜點訂單確認】\n`;
        msg += `訂單編號：${newOrderId}\n`;
        msg += `訂購人：${data.customer_name} (${data.phone})\n`;
        msg += `總金額：$${finalPrice}\n`;
        msg += `取貨日期：${data.pickup_date}\n`;
        if (data.delivery_method === 'delivery') {
          msg += `配送地址：${finalAddress}\n`;
        } else {
          msg += `取貨時間：${data.pickup_time}\n`;
        }

        msg += `\n訂購內容：\n`;
        items.forEach(item => {
          msg += `● ${item.name} | ${item.variant_name || '單一規格'} x ${item.quantity}\n`;
        });

        if (data.delivery_notes) msg += `\n備註：${data.delivery_notes}`;

        msg += `\n\n付款方式：\n`;
        msg += `LINE Bank (824) 連線商業銀行\n`;
        msg += `帳號：111007479473\n`;
        msg += `備註欄請填寫：${newOrderId}\n`;
        msg += `\n付款完成後請回傳「後五碼」\n`;
        msg += `   （轉帳通知中的後五碼數字）`;

        // 7. 建立 LINE 連結（改為手動按鈕，不自動跳轉）
        const encodedMsg = encodeURIComponent(msg);
        const lineUrl = `https://line.me/R/oaMessage/@931cxefd/?text=${encodedMsg}`;
        setLinePayUrl(lineUrl);

      } else {
      alert(`訂單失敗：${result.message}`);
      }
    } catch (error) {
      console.error('訂單錯誤:', error);
      alert('系統錯誤，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // LINE Pay 付款跳轉
  const handleLinePayRedirect = async () => {
    setIsLinePayLoading(true);
    try {
      const res = await fetch('/api/payment/linepay/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount: confirmedAmount, items: savedItems }),
      });
      const data = await res.json();
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert(`LINE Pay 發起失敗：${data.message}`);
      }
    } catch {
      alert('LINE Pay 連線失敗，請改用轉帳付款');
    } finally {
      setIsLinePayLoading(false);
    }
  };

  // 驗證優惠碼邏輯 (略過 UI 顯示部分直接用)
  const handleValidatePromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoMessage('');
    try {
      const response = await fetch('/api/promo-code/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.toUpperCase().trim(), orderAmount: totalPrice }),
      });
      const result = await response.json();
      if (result.success && result.data.valid) {
        const normalizedCode = promoInput.toUpperCase().trim();
        setPromoCode(normalizedCode, result.data.discount_amount);
        setPromoInput('');
        setPromoError('');
        setPromoMessage(result.message || `已成功套用 ${normalizedCode}`);
      } else {
        clearPromoCode();
        setPromoError(result.message || result.data?.message || '優惠碼無效');
      }
    } catch (error) {
      clearPromoCode();
      setPromoError('驗證失敗，請稍後再試');
    }
    finally { setPromoLoading(false); }
  };

  const handleRemovePromo = () => {
    clearPromoCode();
    setPromoError('');
    setPromoMessage('已移除優惠碼。');
  };

  useEffect(() => {
    if (!promoCode) {
      return;
    }

    const revalidatePromo = async () => {
      try {
        const response = await fetch('/api/promo-code/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: promoCode, orderAmount: totalPrice }),
        });
        const result = await response.json();

        if (result.success && result.data.valid) {
          setPromoCode(promoCode, result.data.discount_amount);
          return;
        }

        clearPromoCode();
        setPromoError(result.message || '優惠碼已不符合目前訂單條件');
      } catch (error) {
        console.error('重新驗證優惠碼失敗:', error);
      }
    };

    void revalidatePromo();
  }, [promoCode, totalPrice, setPromoCode, clearPromoCode]);

  // 成功畫面：顯示訂單資訊 + 手動前往 LINE 按鈕
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-moon-black flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* 標題 */}
          <div className="text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-moon-accent mx-auto" />
            <h2 className="text-xl text-moon-accent tracking-widest">訂單成立</h2>
            <p className="text-xs text-moon-muted tracking-wider">ORDER CONFIRMED</p>
          </div>

          {/* 訂單摘要 */}
          <div className="border border-moon-border/30 p-5 space-y-3 bg-moon-dark/40">
            <div className="flex justify-between text-sm">
              <span className="text-moon-muted">訂單編號</span>
              <span className="text-moon-accent font-mono tracking-widest">{orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-moon-muted">訂購人</span>
              <span className="text-moon-text">{confirmedName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-moon-muted">應付金額</span>
              <span className="text-moon-accent font-light">NT$ {confirmedAmount}</span>
            </div>
          </div>

          {/* LINE Pay 按鈕（主要付款） */}
          <button
            onClick={handleLinePayRedirect}
            disabled={isLinePayLoading}
            className="flex items-center justify-center gap-2 w-full bg-[#00B900] hover:bg-[#00a000] disabled:opacity-50 text-white py-4 tracking-widest text-sm transition-colors"
          >
            {isLinePayLoading ? '跳轉中…' : '立即用 LINE Pay 付款 →'}
          </button>

          {/* 轉帳備用方案 */}
          <div className="border border-moon-border/20 p-4 space-y-2 bg-moon-dark/20">
            <p className="text-xs text-moon-muted tracking-wider mb-2">— 或改用轉帳 —</p>
            <p className="text-sm text-moon-text">LINE Bank（824）連線商業銀行</p>
            <p className="text-sm text-moon-text">帳號：111007479473</p>
            <p className="text-xs text-moon-muted mt-2">
              轉帳備註請填寫訂單編號：<span className="text-moon-accent font-mono">{orderId}</span>
            </p>
            <p className="text-xs text-moon-muted">完成後請在 LINE 回傳後五碼</p>
          </div>

          {/* LINE 訊息按鈕（轉帳用） */}
          {linePayUrl && (
            <a
              href={linePayUrl}
              className="flex items-center justify-center gap-2 w-full border border-[#00B900]/40 text-[#00B900] hover:bg-[#00B900]/10 py-3 tracking-widest text-sm transition-colors"
            >
              前往 LINE 回報轉帳 →
            </a>
          )}

          <p className="text-center text-xs text-moon-muted/60">
            訂單確認信已發送至您的信箱（若有填寫）
          </p>

          <Link href="/" className="block text-center text-xs text-moon-muted underline underline-offset-4">
            返回首頁
          </Link>

          <Link
            href="/account"
            className="block text-center text-xs text-moon-muted underline underline-offset-4 transition-colors hover:text-moon-accent"
          >
            前往會員中心
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-moon-black py-16 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-light text-moon-accent mb-4">購物車是空的</h2>
          <p className="text-sm text-moon-muted mb-6">先選一些甜點再來結帳吧</p>
          <Link
            href="/"
            className="inline-flex border border-moon-border px-8 py-3 text-moon-text transition-colors hover:bg-moon-border"
          >
            返回選購
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-moon-black py-8 sm:py-12 lg:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* 步驟引導 */}
        <div className="flex justify-center gap-4 sm:gap-8 mb-6 sm:mb-8">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-moon-accent text-moon-black text-xs flex items-center justify-center">1</span>
            <span className="text-xs text-moon-muted hidden sm:inline">選商品</span>
          </div>
          <div className="w-8 h-px bg-moon-border self-center" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full border border-moon-accent text-moon-accent text-xs flex items-center justify-center">2</span>
            <span className="text-xs text-moon-accent hidden sm:inline">填資料</span>
          </div>
          <div className="w-8 h-px bg-moon-border self-center" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full border border-moon-border text-moon-muted text-xs flex items-center justify-center">3</span>
            <span className="text-xs text-moon-muted hidden sm:inline">確認訂單</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-moon-accent text-center mb-8 sm:mb-12 lg:mb-16 tracking-wider">
          填寫訂單
        </h1>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* 左側：訂單總覽 */}
          <div>
            <div className="border border-moon-border bg-moon-dark p-4 sm:p-6 lg:p-8 sticky top-24">
              <h2 className="text-lg sm:text-xl font-light text-moon-accent mb-6 sm:mb-8 tracking-wider">訂單摘要</h2>
              {/* Product List */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 border-b border-moon-border pb-4 last:border-0">
                    <div className="relative w-16 h-16 bg-moon-gray flex-shrink-0">
                      {item.image_url && <Image src={item.image_url} alt={item.name} fill className="object-cover" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm text-moon-accent">{item.name}</h3>
                      <p className="text-xs text-moon-muted">{item.variant_name}</p>
                      <p className="text-xs text-moon-muted">${item.price} x {item.quantity}</p>
                    </div>
                    <div className="text-sm text-moon-accent">${item.price * item.quantity}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t border-moon-border">
                <div className="flex justify-between text-moon-muted text-sm"><span>小計</span><span>${totalPrice}</span></div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-moon-accent text-sm"><span>折扣</span><span>-${discountAmount}</span></div>
                )}
                {watchedDeliveryMethod === 'delivery' && (
                  <div className="flex justify-between text-moon-muted text-sm"><span>運費</span><span>${deliveryFee}</span></div>
                )}
                <div className="flex justify-between text-moon-accent text-xl pt-2 border-t border-moon-border mt-2">
                  <span>總計</span><span>${finalPrice}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：表單 */}
          <div>
            <form onSubmit={handleSubmit(onSubmit)} className="border border-moon-border bg-moon-dark p-4 sm:p-6 lg:p-8 space-y-6">

              {/* Promo Code */}
              <div className="space-y-2">
                <label className="text-xs tracking-widest text-moon-muted flex items-center gap-2"><Tag size={12} /> 優惠碼</label>
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value)}
                    className="flex-1 bg-moon-black border border-moon-border px-3 py-2 text-moon-text text-sm focus:border-moon-accent outline-none placeholder:text-moon-muted"
                    placeholder="若有優惠碼請輸入"
                  />
                  <button
                    type="button"
                    onClick={handleValidatePromo}
                    disabled={promoLoading}
                    className="px-4 bg-moon-gray text-white text-xs hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                  >
                    {promoLoading ? '驗證中...' : '套用'}
                  </button>
                </div>
                {promoCode ? (
                  <div className="flex items-center justify-between rounded border border-moon-accent/30 bg-moon-accent/10 px-3 py-2 text-xs">
                    <div className="space-y-1">
                      <p className="text-moon-accent">已套用優惠碼：{promoCode}</p>
                      <p className="text-moon-muted">本次折扣：NT$ {discountAmount}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-moon-muted transition-colors hover:text-moon-accent"
                    >
                      移除
                    </button>
                  </div>
                ) : null}
                {promoMessage && <p className="text-xs text-green-400">{promoMessage}</p>}
                {promoError && <p className="text-xs text-red-400">{promoError}</p>}
              </div>

              {/* Personal Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-moon-border pb-2">
                  <h3 className="text-sm font-light text-moon-accent">聯絡資訊</h3>
                  {authStatus === 'loading' ? (
                    <span className="text-xs text-moon-muted">正在確認會員登入狀態...</span>
                  ) : loggedInUser ? (
                    <span className="text-xs text-moon-accent bg-moon-accent/10 px-2 py-1 rounded flex items-center gap-1">
                      <User size={12} /> 會員：{loggedInUser.email}
                    </span>
                  ) : (
                    <Link href="/auth/login?redirect=/checkout" className="text-xs text-moon-muted hover:text-moon-accent flex items-center gap-1 underline decoration-dotted">
                      <LogIn size={12} /> 已是會員？登入
                    </Link>
                  )}
                </div>
                <div className="rounded border border-moon-border/60 bg-moon-black/40 px-3 py-3 text-xs text-moon-muted">
                  <div className="flex items-center justify-between gap-3">
                    <p>{authMessage || '登入後可自動帶入會員姓名、電話與 Email。'}</p>
                    {authStatus !== 'authenticated' ? (
                      <button
                        type="button"
                        onClick={() => void resolveCheckoutSession()}
                        className="shrink-0 text-moon-accent transition-colors hover:text-moon-text"
                      >
                        <RefreshCw className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-moon-muted block mb-1">姓名 <span className="text-moon-accent">*</span></label>
                  <input
                    {...register('customer_name', { required: '請填寫姓名' })}
                    placeholder="例：王小明"
                    className="w-full bg-moon-black border border-moon-border px-3 py-2 text-moon-text focus:border-moon-accent outline-none placeholder:text-moon-muted"
                  />
                  {errors.customer_name && <p className="text-xs text-red-400 mt-1">{errors.customer_name.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-moon-muted block mb-1">電話 <span className="text-moon-accent">*</span></label>
                  <input
                    type="tel"
                    {...register('phone', { required: '請填寫聯絡電話' })}
                    placeholder="例：0912-345-678"
                    className="w-full bg-moon-black border border-moon-border px-3 py-2 text-moon-text focus:border-moon-accent outline-none placeholder:text-moon-muted"
                  />
                  {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-moon-muted block mb-1">電子信箱 <span className="text-moon-accent">*</span></label>
                  <input
                    type="email"
                    {...register('email', { required: '請填寫 Email' })}
                    placeholder="例：example@gmail.com"
                    className="w-full bg-moon-black border border-moon-border px-3 py-2 text-moon-text focus:border-moon-accent outline-none placeholder:text-moon-muted"
                  />
                  <p className="text-[10px] text-moon-muted mt-1">
                    訂單確認與匯款資訊將寄至此信箱
                  </p>
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                </div>
              </div>

              {/* Delivery Method */}
              <div className="space-y-4">
                <h3 className="text-sm font-light text-moon-accent border-b border-moon-border pb-2">取貨方式</h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`border p-4 cursor-pointer text-center transition-all ${watchedDeliveryMethod === 'pickup' ? 'border-moon-accent bg-moon-accent/10' : 'border-moon-border'}`}>
                    <input type="radio" value="pickup" {...register('delivery_method')} className="sr-only" />
                    <div className="text-xl mb-1">🏪</div>
                    <div className="text-xs">門市自取</div>
                  </label>
                  <label className={`border p-4 cursor-pointer text-center transition-all ${watchedDeliveryMethod === 'delivery' ? 'border-moon-accent bg-moon-accent/10' : 'border-moon-border'}`}>
                    <input type="radio" value="delivery" {...register('delivery_method')} className="sr-only" />
                    <div className="text-xl mb-1">🚚</div>
                    <div className="text-xs">宅配 (+$150)</div>
                  </label>
                </div>
              </div>

              {/* Date Selection — 格子選單 */}
              <div className="space-y-3">
                <label className="text-xs text-moon-muted block">
                  {watchedDeliveryMethod === 'pickup' ? '取貨日期' : '期望到貨日期'} <span className="text-moon-accent">*</span>
                </label>
                <p className="text-[10px] text-moon-muted">
                  {watchedDeliveryMethod === 'pickup' ? '週一公休' : '週日、週一不配送'} • 需提前 3 天預訂
                </p>

                {/* 隱藏 input 用於 react-hook-form 驗證 */}
                <input type="hidden" {...register('pickup_date', { required: '請選擇日期' })} />

                <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {calendarDates.map(({ date, label, dayName, disabled, reason }) => (
                    <button
                      key={date}
                      type="button"
                      disabled={disabled}
                      title={disabled ? reason : date}
                      onClick={() => {
                        setSelectedDate(date);
                        setValue('pickup_date', date);
                        validateSelectedDate(date);
                      }}
                      className={`flex flex-col items-center py-2 px-1 border text-center transition-all text-xs
                        ${selectedDate === date
                          ? 'border-moon-accent bg-moon-accent/20 text-moon-accent'
                          : disabled
                            ? 'border-moon-border/30 text-moon-muted/30 cursor-not-allowed bg-transparent'
                            : 'border-moon-border text-moon-text hover:border-moon-accent hover:text-moon-accent'
                        }`}
                    >
                      <span className="text-[10px] opacity-70">{dayName}</span>
                      <span className="font-light">{label}</span>
                    </button>
                  ))}
                </div>

                {selectedDate && <p className="text-xs text-moon-accent">已選：{selectedDate}</p>}
                {errors.pickup_date && <p className="text-xs text-red-400">{errors.pickup_date.message}</p>}
                {dateValidation && !dateValidation.valid && <p className="text-xs text-red-400">{dateValidation.reason}</p>}

                {watchedDeliveryMethod === 'pickup' && (
                  <div>
                    <label className="text-xs text-moon-muted block mb-1">取貨時段 <span className="text-moon-accent">*</span></label>
                    <div className="grid grid-cols-3 gap-2">
                      {['12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'].map(slot => {
                        const watched = watch('pickup_time');
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setValue('pickup_time', slot)}
                            className={`border py-2 text-xs transition-all ${watched === slot
                              ? 'border-moon-accent bg-moon-accent/20 text-moon-accent'
                              : 'border-moon-border text-moon-muted hover:border-moon-accent'
                              }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                    <input type="hidden" {...register('pickup_time', { required: watchedDeliveryMethod === 'pickup' ? '請選擇時段' : false })} />
                    {errors.pickup_time && <p className="text-xs text-red-400 mt-1">{errors.pickup_time.message}</p>}
                  </div>
                )}
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-light text-moon-accent border-b border-moon-border pb-2">
                  {watchedDeliveryMethod === 'pickup' ? '自取地址' : '宅配地址'}
                </h3>

                {watchedDeliveryMethod === 'pickup' ? (
                  <div className="bg-moon-black/50 p-4 border border-moon-border flex items-start gap-3">
                    <MapPin className="text-moon-accent mt-1" size={16} />
                    <div>
                      <p className="text-moon-text text-sm">月島甜點店</p>
                      <p className="text-moon-muted text-xs">台南市安南區本原街一段97巷</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <select
                          {...register('delivery_city', { required: watchedDeliveryMethod === 'delivery' ? '請選擇縣市' : false })}
                          onChange={(e) => {
                            setSelectedCity(e.target.value);
                            setSelectedDistrict('');
                          }}
                          className="w-full bg-moon-black border border-moon-border px-3 py-2 text-moon-text focus:border-moon-accent outline-none"
                        >
                          <option value="">請選擇縣市</option>
                          {TAIWAN_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                        {errors.delivery_city && <p className="text-xs text-red-400 mt-1">{errors.delivery_city.message}</p>}
                      </div>
                      <div>
                        <select
                          {...register('delivery_district', { required: watchedDeliveryMethod === 'delivery' ? '請選擇區域' : false })}
                          onChange={(e) => setSelectedDistrict(e.target.value)}
                          className="w-full bg-moon-black border border-moon-border px-3 py-2 text-moon-text focus:border-moon-accent outline-none"
                        >
                          <option value="">請選擇區域</option>
                          {districts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        {errors.delivery_district && <p className="text-xs text-red-400 mt-1">{errors.delivery_district.message}</p>}
                      </div>
                    </div>
                    <div>
                      <input
                        {...register('delivery_address_detail', { required: watchedDeliveryMethod === 'delivery' ? '請輸入詳細地址' : false })}
                        placeholder="例：中正路 123 號"
                        className="w-full bg-moon-black border border-moon-border px-3 py-2 text-moon-text focus:border-moon-accent outline-none placeholder:text-moon-muted"
                      />
                      {errors.delivery_address_detail && <p className="text-xs text-red-400 mt-1">{errors.delivery_address_detail.message}</p>}
                    </div>
                    <textarea
                      {...register('delivery_notes')}
                      placeholder="備註 (選填)"
                      rows={2}
                      className="w-full bg-moon-black border border-moon-border px-3 py-2 text-moon-text focus:border-moon-accent outline-none"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-moon-accent text-moon-black py-4 text-sm tracking-widest hover:bg-moon-text transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '處理中，請稍候...' : `送出訂單 · 總計 $${finalPrice}`}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
