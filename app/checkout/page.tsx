'use client';

// 結帳頁不需要被搜尋引擎索引
// 注意: Client Components 不能直接導出 metadata,
// 需要在父層 layout 或 Server Component 中設定

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useCartStore } from '@/store/cartStore';
import { Calendar, Phone, User, Loader2, CheckCircle, Mail, Tag, X, MapPin, LogIn } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { TAIWAN_CITIES } from '@/lib/taiwan-data';
import { supabase } from '@/lib/supabase'; // Import Supabase
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
  const router = useRouter();
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
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [linePayUrl, setLinePayUrl] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
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

  // 從 profiles 表載入用戶資料
  const loadUserProfile = async (userId: string, email: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', userId)
        .single();
      if (profile?.full_name) setValue('customer_name', profile.full_name);
      if (profile?.phone) setValue('phone', profile.phone);
    } catch { }
    setValue('email', email);
  };

  useEffect(() => {
    // 1. 立即讀取當前 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const { id, email } = session.user;
        setLoggedInUser({ email: email || '', id });
        loadUserProfile(id, email || '');
      }
    });

    // 2. 監聽 Auth 狀態變更
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const { id, email } = session.user;
        setLoggedInUser({ email: email || '', id });
        loadUserProfile(id, email || '');
      } else {
        setLoggedInUser(null);
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
  const watchedCustomerName = watch('customer_name');
  const watchedPhone = watch('phone');
  const watchedEmail = watch('email');
  const watchedPickupTime = watch('pickup_time');
  const watchedDeliveryCity = watch('delivery_city');
  const watchedDeliveryDistrict = watch('delivery_district');
  const watchedDeliveryAddressDetail = watch('delivery_address_detail');
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

  const checkoutChecklist = useMemo(() => {
    const contactReady =
      !!watchedCustomerName?.trim() &&
      !!watchedPhone?.trim() &&
      !!watchedEmail?.trim();
    const dateReady =
      !!selectedDate &&
      (watchedDeliveryMethod === 'pickup' ? !!watchedPickupTime : true) &&
      !!dateValidation?.valid;
    const addressReady =
      watchedDeliveryMethod === 'pickup'
        ? true
        : !!watchedDeliveryCity && !!watchedDeliveryDistrict && !!watchedDeliveryAddressDetail?.trim();

    return [
      {
        id: 'contact',
        label: '聯絡資訊',
        detail: contactReady ? '姓名 / 電話 / Email 已完成' : '請填寫基本聯絡資訊',
        done: contactReady,
      },
      {
        id: 'date',
        label: watchedDeliveryMethod === 'pickup' ? '取貨時間' : '到貨日期',
        detail: dateReady
          ? watchedDeliveryMethod === 'pickup'
            ? `${selectedDate} ${watchedPickupTime}`
            : `${selectedDate} 宅配`
          : watchedDeliveryMethod === 'pickup'
            ? '請選擇取貨日期與時段'
            : '請選擇到貨日期',
        done: dateReady,
      },
      {
        id: 'address',
        label: watchedDeliveryMethod === 'pickup' ? '取貨方式' : '配送地址',
        detail: watchedDeliveryMethod === 'pickup'
          ? '門市自取'
          : addressReady
            ? `${watchedDeliveryCity}${watchedDeliveryDistrict}${watchedDeliveryAddressDetail}`
            : '請補齊宅配地址',
        done: addressReady,
      },
    ];
  }, [
    watchedCustomerName,
    watchedPhone,
    watchedEmail,
    selectedDate,
    watchedPickupTime,
    dateValidation,
    watchedDeliveryMethod,
    watchedDeliveryCity,
    watchedDeliveryDistrict,
    watchedDeliveryAddressDetail,
  ]);

  const completedChecklistCount = checkoutChecklist.filter((item) => item.done).length;
  const incompleteChecklistCount = checkoutChecklist.length - completedChecklistCount;
  const checklistProgress = Math.round(
    (completedChecklistCount / checkoutChecklist.length) * 100
  );
  const isCheckoutReady = incompleteChecklistCount === 0 && !isSubmitting;

  // 提交訂單
  const onSubmit = async (data: CheckoutFormData) => {
    setSubmitError('');

    if (dateValidation && !dateValidation.valid) {
      setSubmitError(dateValidation.reason);
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
        setConfirmedEmail(data.email);
        // 儲存姓名電話到 profiles（登入用戶）
        if (loggedInUser?.id) {
          supabase.from('profiles').upsert({
            id: loggedInUser.id,
            full_name: data.customer_name,
            phone: data.phone,
            updated_at: new Date().toISOString(),
          }).then(() => { });
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
        setSubmitError(`訂單失敗：${result.message}`);
      }
    } catch (error) {
      console.error('訂單錯誤:', error);
      setSubmitError('系統錯誤，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 驗證優惠碼邏輯 (略過 UI 顯示部分直接用)
  const handleValidatePromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    try {
      const response = await fetch('/api/promo-code/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.toUpperCase().trim(), orderAmount: totalPrice }),
      });
      const result = await response.json();
      if (result.success && result.data.valid) {
        setPromoCode(promoInput.toUpperCase().trim(), result.data.discount_amount);
        setPromoInput(''); setPromoError('');
      } else {
        setPromoError(result.data?.message || '優惠碼無效');
      }
    } catch (error) { setPromoError('驗證失敗'); }
    finally { setPromoLoading(false); }
  };

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
            {confirmedEmail && (
              <div className="flex justify-between text-sm">
                <span className="text-moon-muted">通知信箱</span>
                <span className="text-moon-text break-all text-right">{confirmedEmail}</span>
              </div>
            )}
          </div>

          <div className="border border-moon-border/20 p-4 space-y-3 bg-moon-dark/20">
            <p className="text-xs text-moon-muted tracking-wider">— 接下來請做這 3 步 —</p>
            <div className="space-y-2 text-sm">
              <p className="text-moon-text">1. 依下方帳號完成轉帳，備註填 <span className="text-moon-accent font-mono">{orderId}</span></p>
              <p className="text-moon-text">2. 點擊 LINE 按鈕，把訂單資訊直接傳給月島甜點</p>
              <p className="text-moon-text">3. 等待我們確認款項後，會再通知你可取貨 / 出貨</p>
            </div>
          </div>

          {/* 付款說明 */}
          <div className="border border-moon-border/20 p-4 space-y-2 bg-moon-dark/20">
            <p className="text-xs text-moon-muted tracking-wider mb-2">— 付款方式 —</p>
            <p className="text-sm text-moon-text">LINE Bank（824）連線商業銀行</p>
            <p className="text-sm text-moon-text">帳號：111007479473</p>
            <p className="text-xs text-moon-muted mt-2">
              轉帳備註請填寫訂單編號：<span className="text-moon-accent font-mono">{orderId}</span>
            </p>
            <p className="text-xs text-moon-muted">完成後請在 LINE 回傳後五碼</p>
          </div>

          {/* LINE 按鈕（手動觸發） */}
          {linePayUrl && (
            <a
              href={linePayUrl}
              className="flex items-center justify-center gap-2 w-full bg-[#00B900] hover:bg-[#00a000] text-white py-4 tracking-widest text-sm transition-colors"
            >
              前往 LINE 完成確認 →
            </a>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href={confirmedEmail ? `/auth/login?email=${encodeURIComponent(confirmedEmail)}` : '/auth/login'}
              className="flex items-center justify-center border border-moon-border text-moon-text py-3 text-xs tracking-widest hover:border-moon-accent hover:text-moon-accent transition-colors"
            >
              查詢我的訂單
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center text-center text-xs text-moon-muted underline underline-offset-4 py-3"
            >
              返回首頁
            </Link>
          </div>
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
          <Link href="/"><button className="border border-moon-border px-8 py-3 text-moon-text hover:bg-moon-border">返回選購</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-moon-black py-8 sm:py-12 lg:py-16 pb-28 lg:pb-16">
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

        <div className="max-w-3xl mx-auto mb-6 sm:mb-8">
          <div className="border border-moon-border bg-moon-dark/60 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs tracking-widest text-moon-muted">CHECKOUT PROGRESS</p>
                <p className="text-sm text-moon-text mt-1">
                  已完成 {completedChecklistCount} / {checkoutChecklist.length} 項
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl text-moon-accent font-light">{checklistProgress}%</p>
                <p className="text-[10px] text-moon-muted">
                  {incompleteChecklistCount === 0 ? '可以送出訂單' : `剩 ${incompleteChecklistCount} 項待完成`}
                </p>
              </div>
            </div>
            <div className="h-1 bg-moon-black">
              <div
                className="h-full bg-moon-accent transition-all duration-300"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {checkoutChecklist.map((item) => (
                <div
                  key={item.id}
                  className={`border px-3 py-3 space-y-1 ${
                    item.done ? 'border-moon-accent/50 bg-moon-accent/5' : 'border-moon-border/60 bg-moon-black/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        item.done ? 'bg-moon-accent text-moon-black' : 'border border-moon-border text-moon-muted'
                      }`}
                    >
                      {item.done ? '✓' : '·'}
                    </span>
                    <p className={`text-xs tracking-wider ${item.done ? 'text-moon-accent' : 'text-moon-muted'}`}>
                      {item.label}
                    </p>
                  </div>
                  <p className="text-xs text-moon-text/80 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

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
            <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="border border-moon-border bg-moon-dark p-4 sm:p-6 lg:p-8 space-y-6">

              {/* Promo Code */}
              <div className="space-y-2">
                <label className="text-xs tracking-widest text-moon-muted flex items-center gap-2"><Tag size={12} /> 優惠碼</label>
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value)}
                    className="flex-1 bg-moon-black border border-moon-border px-3 py-2 text-white text-sm focus:border-moon-accent outline-none placeholder:text-gray-500"
                    placeholder="若有優惠碼請輸入"
                  />
                  <button type="button" onClick={handleValidatePromo} className="px-4 bg-moon-gray text-white text-xs hover:bg-white hover:text-black transition-colors">套用</button>
                </div>
                {promoCode && <p className="text-xs text-moon-accent">已套用：{promoCode}</p>}
                {promoError && <p className="text-xs text-red-400">{promoError}</p>}
              </div>

              {submitError && (
                <div className="border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                  {submitError}
                </div>
              )}

              {/* Personal Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-moon-border pb-2">
                  <h3 className="text-sm font-light text-moon-accent">聯絡資訊</h3>
                  {loggedInUser ? (
                    <span className="text-xs text-moon-accent bg-moon-accent/10 px-2 py-1 rounded flex items-center gap-1">
                      <User size={12} /> 會員：{loggedInUser.email}
                    </span>
                  ) : (
                    <Link href="/auth/login" className="text-xs text-moon-muted hover:text-white flex items-center gap-1 underline decoration-dotted">
                      <LogIn size={12} /> 已是會員？登入
                    </Link>
                  )}
                </div>
                <div>
                  <label className="text-xs text-moon-muted block mb-1">姓名 <span className="text-moon-accent">*</span></label>
                  <input
                    {...register('customer_name', { required: '請填寫姓名' })}
                    placeholder="例：王小明"
                    className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none placeholder:text-gray-500"
                  />
                  {errors.customer_name && <p className="text-xs text-red-400 mt-1">{errors.customer_name.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-moon-muted block mb-1">電話 <span className="text-moon-accent">*</span></label>
                  <input
                    type="tel"
                    {...register('phone', { required: '請填寫聯絡電話' })}
                    placeholder="例：0912-345-678"
                    className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none placeholder:text-gray-500"
                  />
                  {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-moon-muted block mb-1">電子信箱 <span className="text-moon-accent">*</span></label>
                  <input
                    type="email"
                    {...register('email', { required: '請填寫 Email' })}
                    placeholder="例：example@gmail.com"
                    className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none placeholder:text-gray-500"
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
                      <p className="text-white text-sm">月島甜點店</p>
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
                          className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none"
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
                          className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none"
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
                        className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none placeholder:text-gray-500"
                      />
                      {errors.delivery_address_detail && <p className="text-xs text-red-400 mt-1">{errors.delivery_address_detail.message}</p>}
                    </div>
                    <textarea
                      {...register('delivery_notes')}
                      placeholder="備註 (選填)"
                      rows={2}
                      className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!isCheckoutReady}
                className="hidden lg:block w-full bg-moon-accent text-moon-black py-4 text-sm tracking-widest hover:bg-white transition-colors disabled:opacity-50 disabled:hover:bg-moon-accent"
              >
                {isSubmitting ? '處理中，請稍候...' : `送出訂單 · 總計 $${finalPrice}`}
              </button>

              <p className="hidden lg:block text-[11px] text-moon-muted">
                送出後會建立訂單編號、寄出確認信，並提供 LINE 一鍵回傳付款資訊。
              </p>

            </form>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-moon-border bg-moon-dark/95 backdrop-blur lg:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-widest text-moon-muted">MOBILE CHECKOUT</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-moon-accent text-lg font-light">${finalPrice}</p>
              <p className="text-[11px] text-moon-muted text-right">
                {incompleteChecklistCount === 0
                  ? '資料已齊，準備送出'
                  : `剩 ${incompleteChecklistCount} 項待完成`}
              </p>
            </div>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={!isCheckoutReady}
            className="shrink-0 bg-moon-accent text-moon-black px-4 py-3 text-xs tracking-widest disabled:opacity-50"
          >
            {isSubmitting ? '送出中' : '送出訂單'}
          </button>
        </div>
      </div>
    </div>
  );
}
