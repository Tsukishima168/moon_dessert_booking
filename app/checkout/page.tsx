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
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [availableDates, setAvailableDates] = useState<Record<string, { available: boolean; reason?: string }>>({});
  const [loadingDates, setLoadingDates] = useState(false);
  const [reservationRules, setReservationRules] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [dateValidation, setDateValidation] = useState<{ valid: boolean; reason: string } | null>(null);

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
  const [loggedInUser, setLoggedInUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setLoggedInUser({ email: session.user.email || '' });
        setValue('email', session.user.email || '');
      }
    });
  }, [setValue]);

  // 載入預訂規則
  useEffect(() => {
    const loadReservationRules = async () => {
      try {
        const response = await fetch('/api/admin/settings');
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

  // 監聽取貨方式變化
  const watchedDeliveryMethod = watch('delivery_method') as 'pickup' | 'delivery';
  useEffect(() => {
    setDeliveryMethod(watchedDeliveryMethod || 'pickup');
  }, [watchedDeliveryMethod]);

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

      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: data.customer_name,
          phone: data.phone,
          email: data.email,
          pickup_time: data.pickup_date ? `${data.pickup_date} ${data.pickup_time}` : `${data.pickup_date} 00:00`,
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
        }),
      });

      const result = await response.json();

      if (result.success) {
        const newOrderId = result.order_id;
        setOrderId(newOrderId);
        setOrderSuccess(true);
        clearCart();

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

        // 7. Redirect to LINE (oaMessage)
        const encodedMsg = encodeURIComponent(msg);
        const lineUrl = `https://line.me/R/oaMessage/@931cxefd/?text=${encodedMsg}`;

        // 成功後直接跳轉 LINE OA
        setTimeout(() => {
          window.location.href = lineUrl;
        }, 1500);

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

  // 成功畫面 (雖然會快速跳轉，但還是保留 UI)
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-moon-black flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin w-12 h-12 text-moon-accent mx-auto" />
          <h2 className="text-xl text-moon-accent tracking-wider">正在前往 LINE 完成訂單確認...</h2>
          <p className="text-moon-muted text-sm">如果沒有自動跳轉，請<a href="https://line.me/R/ti/p/@838jomhj" className="underline text-white">點擊這裡</a></p>
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
                    className="flex-1 bg-moon-black border border-moon-border px-3 py-2 text-white text-sm focus:border-moon-accent outline-none placeholder:text-gray-500"
                    placeholder="若有優惠碼請輸入"
                  />
                  <button type="button" onClick={handleValidatePromo} className="px-4 bg-moon-gray text-white text-xs hover:bg-white hover:text-black transition-colors">套用</button>
                </div>
                {promoCode && <p className="text-xs text-moon-accent">已套用：{promoCode}</p>}
                {promoError && <p className="text-xs text-red-400">{promoError}</p>}
              </div>

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

              {/* Date Selection */}
              <div className="space-y-4">
                <label className="text-xs text-moon-muted block mb-1">
                  {watchedDeliveryMethod === 'pickup' ? '取貨日期' : '期望到貨日期'} <span className="text-moon-accent">*</span>
                </label>
                <input
                  type="date"
                  {...register('pickup_date', {
                    required: true,
                    validate: () => dateValidation?.valid || dateValidation?.reason
                  })}
                  min={getMinPickupDate()} // Enforce today + 3
                  max={getMaxPickupDate()}
                  className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none"
                />

                {/* Date Validation Hints */}
                {dateValidation && !dateValidation.valid && <p className="text-xs text-red-400 mt-1">{dateValidation.reason}</p>}
                {!dateValidation && <p className="text-xs text-moon-muted mt-1">
                  {watchedDeliveryMethod === 'pickup' ? '週一公休' : '週日、週一不配送'} • 需提前 3 天預訂
                </p>}

                {watchedDeliveryMethod === 'pickup' && (
                  <div>
                    <label className="text-xs text-moon-muted block mb-1">取貨時段 <span className="text-moon-accent">*</span></label>
                    <select {...register('pickup_time')} className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none">
                      <option value="12:00-13:00">12:00 - 13:00</option>
                      <option value="13:00-14:00">13:00 - 14:00</option>
                      <option value="14:00-15:00">14:00 - 15:00</option>
                      <option value="15:00-16:00">15:00 - 16:00</option>
                      <option value="16:00-17:00">16:00 - 17:00</option>
                      <option value="17:00-18:00">17:00 - 18:00</option>
                    </select>
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
                disabled={isSubmitting}
                className="w-full bg-moon-accent text-moon-black py-4 text-sm tracking-widest hover:bg-white transition-colors disabled:opacity-50"
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
