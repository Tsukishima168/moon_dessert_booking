'use client';

// 結帳頁不需要被搜尋引擎索引
// 注意: Client Components 不能直接導出 metadata,
// 需要在父層 layout 或 Server Component 中設定

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useCartStore } from '@/store/cartStore';
import { Calendar, Phone, User, Loader2, CheckCircle, Mail, Tag, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface CheckoutFormData {
  customer_name: string;
  phone: string;
  email: string;
  delivery_method: 'pickup' | 'delivery';
  pickup_date: string;
  pickup_time: string;
  delivery_address?: string;
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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    defaultValues: {
      delivery_method: 'pickup',
    },
  });

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

  // 計算最早取貨日期（根據後台設定）
  const getMinPickupDate = () => {
    const date = new Date();
    const minDays = reservationRules?.min_advance_days || 3;
    date.setDate(date.getDate() + minDays);
    return date.toISOString().split('T')[0];
  };

  // 計算最晚取貨日期（根據後台設定）
  const getMaxPickupDate = () => {
    const date = new Date();
    const maxDays = reservationRules?.max_advance_days || 30;
    date.setDate(date.getDate() + maxDays);
    return date.toISOString().split('T')[0];
  };

  // 驗證選擇的日期
  const validateSelectedDate = async (date: string) => {
    if (!date) return;

    try {
      // 1. 驗證預訂規則
      const validationResponse = await fetch(`/api/validate-reservation?date=${date}`);
      if (validationResponse.ok) {
        const result = await validationResponse.json();
        setDateValidation(result);

        if (!result.valid) {
          return;
        }
      }

      // 2. 檢查產能
      const capacityResponse = await fetch(`/api/check-capacity?date=${date}&delivery_method=${watchedDeliveryMethod}`);
      if (capacityResponse.ok) {
        const capacity = await capacityResponse.json();

        if (!capacity.available) {
          setDateValidation({
            valid: false,
            reason: capacity.reason || '當日已達產能上限',
          });
        }
      }
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

  // 檢查日期是否可用
  const isDateAvailable = (date: string): { available: boolean; reason?: string } => {
    if (!date) return { available: false };

    const dateInfo = availableDates[date];
    if (dateInfo) {
      return dateInfo;
    }

    // 如果沒有載入到該日期的資訊，預設允許（向後兼容）
    return { available: true };
  };

  // 運費計算（固定150，滿2000免運）
  const calculateDeliveryFee = (method: 'pickup' | 'delivery', subtotal: number): number => {
    if (method === 'pickup') return 0;
    // 滿2000免運
    if (subtotal >= 2000) return 0;
    return 150; // 固定運費
  };

  // 監聽取貨方式變化，重新計算總價
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const deliveryFee = calculateDeliveryFee(deliveryMethod, totalPrice);
  const finalPrice = getFinalPrice() + deliveryFee;

  // 自動將舊的購物車價格字串（含 $、逗號）轉成數字，避免出現 NaN
  useEffect(() => {
    normalizePrices();
  }, [normalizePrices]);

  // 載入可預訂日期列表
  useEffect(() => {
    const loadAvailableDates = async () => {
      setLoadingDates(true);
      try {
        const minDate = getMinPickupDate();
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 30); // 未來 30 天

        const response = await fetch(
          `/api/available-dates?start_date=${minDate}&end_date=${maxDate.toISOString().split('T')[0]}&delivery_method=${watchedDeliveryMethod || 'pickup'}`
        );

        const result = await response.json();

        if (result.success && result.data) {
          const datesMap: Record<string, { available: boolean; reason?: string }> = {};
          result.data.forEach((item: any) => {
            datesMap[item.date] = {
              available: item.available,
              reason: item.reason,
            };
          });
          setAvailableDates(datesMap);
        }
      } catch (error) {
        console.error('載入可預訂日期錯誤:', error);
        // 如果載入失敗，不限制日期（允許所有日期）
      } finally {
        setLoadingDates(false);
      }
    };

    loadAvailableDates();
  }, [watchedDeliveryMethod]);

  // 給 LINE 匯款回報用的預設訊息
  const lineReportMessage = useMemo(() => {
    if (!orderSuccess || !orderId) return '';
    const amount = confirmedAmount || finalPrice || totalPrice;
    const name = confirmedName || '';
    return [
      '【月島甜點匯款回報】',
      `訂單編號：${orderId}`,
      name ? `訂購人：${name}` : '訂購人：',
      `金額：$${amount}`,
      '轉帳後五碼：_____',
    ].join('\n');
  }, [orderSuccess, orderId, confirmedAmount, finalPrice, totalPrice, confirmedName]);

  // 如果購物車是空的
  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="min-h-screen bg-moon-black py-16">
        <div className="max-w-2xl mx-auto px-6">
          <div className="border border-moon-border bg-moon-dark p-16 text-center">
            <div className="text-6xl mb-6 opacity-20">🛒</div>
            <h2 className="text-2xl font-light text-moon-accent mb-4 tracking-wide">
              YOUR CART IS EMPTY
            </h2>
            <p className="text-sm text-moon-muted mb-8 leading-relaxed">
              Please add items to your cart before checkout
            </p>
            <Link href="/">
              <button className="border border-moon-border text-moon-text px-8 py-3 text-sm tracking-widest hover:bg-moon-border transition-colors">
                BACK TO SHOP
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 驗證優惠碼
  const handleValidatePromo = async () => {
    if (!promoInput.trim()) {
      setPromoError('請輸入優惠碼');
      return;
    }

    setPromoLoading(true);
    setPromoError('');

    try {
      const response = await fetch('/api/promo-code/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: promoInput.toUpperCase().trim(),
          orderAmount: totalPrice,
        }),
      });

      const result = await response.json();

      if (result.success && result.data.valid) {
        setPromoCode(promoInput.toUpperCase().trim(), result.data.discount_amount);
        setPromoInput('');
        setPromoError('');
      } else {
        setPromoError(result.data?.message || '優惠碼無效');
      }
    } catch (error) {
      console.error('驗證優惠碼錯誤:', error);
      setPromoError('驗證失敗，請稍後再試');
    } finally {
      setPromoLoading(false);
    }
  };

  // 提交訂單
  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true);

    try {
      const pickup_time = data.delivery_method === 'pickup'
        ? `${data.pickup_date} ${data.pickup_time}`
        : null;

      const response = await fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: data.customer_name,
          phone: data.phone,
          email: data.email,
          pickup_time: pickup_time || `${data.pickup_date} ${data.pickup_time}`, // 宅配也記錄預計出貨日期
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
          payment_date: data.payment_date,
          delivery_method: data.delivery_method || 'pickup',
          delivery_address: data.delivery_method === 'delivery' ? data.delivery_address : null,
          delivery_fee: data.delivery_method === 'delivery' ? deliveryFee : 0,
          delivery_notes: data.delivery_method === 'delivery' ? (data.delivery_notes || null) : null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setOrderId(result.order_id);
        setConfirmedName(data.customer_name);
        setConfirmedAmount(finalPrice);
        setOrderSuccess(true);
        clearCart();

        setTimeout(() => {
          router.push('/');
        }, 5000);
      } else {
        alert(`訂單失敗：${result.message}`);
      }
    } catch (error) {
      console.error('提交訂單錯誤:', error);
      alert('系統錯誤，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLineMessage = async () => {
    if (!lineReportMessage) return;
    try {
      await navigator.clipboard.writeText(lineReportMessage);
      alert('已複製匯款回報內容，請到 LINE 貼上並填寫後五碼。');
    } catch (error) {
      console.error('複製失敗', error);
      alert('複製失敗，請手動選取文字複製。');
    }
  };

  const handleOpenLine = () => {
    if (!lineReportMessage) return;
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(lineReportMessage)}`;
    window.location.href = url;
  };

  // 訂單成功畫面
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-moon-black py-16 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-6">
          <div className="border border-moon-border bg-moon-dark p-16 text-center">
            <div className="mb-6 flex justify-center">
              <Image
                src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768736617/mbti_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F_1_zpt5jq.webp"
                alt="Kiwimu"
                width={80}
                height={80}
                className="h-16 w-auto"
              />
            </div>
            <CheckCircle size={48} className="text-moon-accent mx-auto mb-4" strokeWidth={1} />
            <h2 className="text-2xl sm:text-3xl font-light text-moon-accent mb-6 tracking-wider">
              ORDER CONFIRMED
            </h2>
            <p className="text-sm text-moon-muted mb-2 tracking-wide">
              Order ID
            </p>
            <p className="font-mono text-moon-accent mb-8 tracking-wider">
              {orderId}
            </p>
            <div className="border-t border-moon-border pt-8 mb-8 space-y-4 text-left sm:text-center">
              <p className="text-xs text-moon-muted leading-relaxed">
                我們已收到您的訂單，請在兩天內完成轉帳，並透過 LINE 回報以下資訊：
              </p>
              {lineReportMessage && (
                <pre className="bg-moon-black border border-moon-border text-left text-xs text-moon-text p-4 whitespace-pre-wrap break-words">
                  {lineReportMessage}
                </pre>
              )}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-center">
                <button
                  type="button"
                  onClick={handleCopyLineMessage}
                  className="flex-1 sm:flex-none border border-moon-border text-moon-text px-4 py-2 text-xs tracking-widest hover:bg-moon-border transition-colors"
                >
                  複製回報內容
                </button>
                <button
                  type="button"
                  onClick={handleOpenLine}
                  className="flex-1 sm:flex-none bg-moon-accent text-moon-black px-4 py-2 text-xs tracking-widest hover:bg-moon-text transition-colors"
                >
                  打開 LINE 回報
                </button>
              </div>
            </div>
            <Link href="/">
              <button className="border border-moon-border text-moon-text px-8 py-3 text-sm tracking-widest hover:bg-moon-border transition-colors">
                BACK TO SHOP
              </button>
            </Link>
            <p className="text-xs text-moon-muted/60 mt-6">Redirecting in 5 seconds...</p>
          </div>
        </div>
      </div>
    );
  }

  // 結帳表單
  return (
    <div className="min-h-screen bg-moon-black py-8 sm:py-12 lg:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-moon-accent text-center mb-8 sm:mb-12 lg:mb-16 tracking-wider">
          CHECKOUT
        </h1>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* 左側：訂單資訊 */}
          <div>
            <div className="border border-moon-border bg-moon-dark p-4 sm:p-6 lg:p-8">
              <h2 className="text-lg sm:text-xl font-light text-moon-accent mb-6 sm:mb-8 tracking-wider">
                ORDER SUMMARY
              </h2>

              <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-moon-border last:border-0"
                  >
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-moon-gray">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-2xl opacity-20">
                          🍰
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-light text-moon-accent mb-1 tracking-wide truncate">
                        {item.name}
                      </h3>
                      {item.variant_name && (
                        <p className="text-[10px] sm:text-xs text-moon-muted mb-1 sm:mb-2 tracking-wider">
                          {item.variant_name}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-moon-muted">
                        ${item.price} × {item.quantity}
                      </p>
                    </div>

                    <div className="text-sm sm:text-base font-light text-moon-accent">
                      ${item.price * item.quantity}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-moon-border pt-4 sm:pt-6 space-y-3">
                {/* 小計 */}
                <div className="flex justify-between items-baseline text-moon-muted">
                  <span className="text-xs tracking-widest">SUBTOTAL</span>
                  <span className="text-sm">${totalPrice}</span>
                </div>

                {/* 優惠折扣 */}
                {promoCode && discountAmount > 0 && (
                  <div className="flex justify-between items-baseline text-moon-accent">
                    <span className="text-xs tracking-widest">
                      DISCOUNT ({promoCode})
                    </span>
                    <span className="text-sm">-${discountAmount}</span>
                  </div>
                )}

                {/* 運費 */}
                {watchedDeliveryMethod === 'delivery' && (
                  <div className="flex justify-between items-baseline text-moon-muted">
                    <span className="text-xs tracking-widest">
                      運費 {deliveryFee === 0 && totalPrice >= 2000 && '(滿額免運)'}
                    </span>
                    <span className="text-sm">
                      {deliveryFee === 0 ? '免費' : `$${deliveryFee}`}
                    </span>
                  </div>
                )}

                {/* 總計 */}
                <div className="flex justify-between items-baseline pt-3 border-t border-moon-border">
                  <span className="text-xs sm:text-sm tracking-widest text-moon-muted">TOTAL</span>
                  <span className="text-2xl sm:text-3xl font-light text-moon-accent tracking-wide">
                    <span className="text-lg sm:text-xl mr-1">$</span>{finalPrice}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：顧客資訊表單 */}
          <div>
            <div className="border border-moon-border bg-moon-dark p-4 sm:p-6 lg:p-8">
              <h2 className="text-lg sm:text-xl font-light text-moon-accent mb-6 sm:mb-8 tracking-wider">
                YOUR INFORMATION
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* 優惠碼區塊 */}
                <div className="bg-moon-black border border-moon-border p-4">
                  <label className="block text-xs tracking-widest text-moon-muted mb-3">
                    <Tag size={14} className="inline mr-2" />
                    PROMO CODE
                  </label>

                  {promoCode ? (
                    // 已套用優惠碼
                    <div className="flex items-center justify-between bg-moon-accent/10 border border-moon-accent px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag size={16} className="text-moon-accent" />
                        <span className="text-sm text-moon-accent tracking-wider">{promoCode}</span>
                        <span className="text-xs text-moon-muted">(-${discountAmount})</span>
                      </div>
                      <button
                        type="button"
                        onClick={clearPromoCode}
                        className="text-moon-muted hover:text-moon-accent transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    // 優惠碼輸入
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => {
                            setPromoInput(e.target.value.toUpperCase());
                            setPromoError('');
                          }}
                          placeholder="Enter code"
                          className="flex-1 px-4 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:border-moon-muted focus:outline-none transition-colors uppercase"
                          disabled={promoLoading}
                        />
                        <button
                          type="button"
                          onClick={handleValidatePromo}
                          disabled={promoLoading || !promoInput.trim()}
                          className="px-6 py-2 bg-moon-gray border border-moon-border text-moon-text text-xs tracking-widest hover:bg-moon-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {promoLoading ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            'APPLY'
                          )}
                        </button>
                      </div>
                      {promoError && (
                        <p className="text-red-400 text-xs mt-2">{promoError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 姓名 */}
                <div>
                  <label className="block text-xs tracking-widest text-moon-muted mb-3">
                    NAME *
                  </label>
                  <input
                    {...register('customer_name', {
                      required: '請輸入姓名',
                      minLength: { value: 2, message: '姓名至少 2 個字' },
                    })}
                    type="text"
                    className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-muted focus:outline-none transition-colors"
                    placeholder="Your name"
                  />
                  {errors.customer_name && (
                    <p className="text-red-400 text-xs mt-2">
                      {errors.customer_name.message}
                    </p>
                  )}
                </div>

                {/* 手機號碼 */}
                <div>
                  <label className="block text-xs tracking-widest text-moon-muted mb-3">
                    PHONE *
                  </label>
                  <input
                    {...register('phone', {
                      required: '請輸入手機號碼',
                      pattern: {
                        value: /^[0-9]{8,12}$/,
                        message: '請輸入有效的手機號碼',
                      },
                    })}
                    type="tel"
                    className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-muted focus:outline-none transition-colors"
                    placeholder="0912345678"
                  />
                  {errors.phone && (
                    <p className="text-red-400 text-xs mt-2">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs tracking-widest text-moon-muted mb-3">
                    EMAIL (Optional)
                  </label>
                  <input
                    {...register('email', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: '請輸入有效的 Email',
                      },
                    })}
                    type="email"
                    className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-muted focus:outline-none transition-colors"
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-2">
                      {errors.email.message}
                    </p>
                  )}
                  <p className="text-xs text-moon-muted/60 mt-2">
                    For order confirmation & payment details
                  </p>
                </div>

                {/* 取貨方式 */}
                <div className="bg-moon-black/50 border border-moon-border p-4">
                  <label className="block text-xs tracking-widest text-moon-muted mb-3">
                    📦 取貨方式 *
                  </label>
                  <div className="flex gap-3">
                    <label className="flex-1 cursor-pointer">
                      <input
                        {...register('delivery_method', {
                          required: '請選擇取貨方式',
                        })}
                        type="radio"
                        value="pickup"
                        onChange={(e) => setDeliveryMethod(e.target.value as 'pickup' | 'delivery')}
                        className="sr-only"
                      />
                      <div className={`
                        border p-4 text-center transition-all
                        ${watchedDeliveryMethod === 'pickup'
                          ? 'border-moon-accent bg-moon-accent/10'
                          : 'border-moon-border hover:border-moon-muted'
                        }
                      `}>
                        <div className="text-2xl mb-2">🏪</div>
                        <div className="text-xs tracking-wider">門市自取</div>
                      </div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input
                        {...register('delivery_method', {
                          required: '請選擇取貨方式',
                        })}
                        type="radio"
                        value="delivery"
                        className="sr-only"
                      />
                      <div className={`
                        border p-4 text-center transition-all
                        ${watchedDeliveryMethod === 'delivery'
                          ? 'border-moon-accent bg-moon-accent/10'
                          : 'border-moon-border hover:border-moon-muted'
                        }
                      `}>
                        <div className="text-2xl mb-2">🚚</div>
                        <div className="text-xs tracking-wider">宅配</div>
                        {watchedDeliveryMethod === 'delivery' && deliveryFee > 0 && (
                          <div className="text-[10px] text-moon-muted mt-1">
                            運費 ${deliveryFee}
                          </div>
                        )}
                        {watchedDeliveryMethod === 'delivery' && deliveryFee === 0 && totalPrice >= 2000 && (
                          <div className="text-[10px] text-moon-accent mt-1">
                            滿額免運
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                  {errors.delivery_method && (
                    <p className="text-red-400 text-xs mt-2">
                      {errors.delivery_method.message}
                    </p>
                  )}
                </div>

                {/* 門市自取：日期和時間 */}
                {watchedDeliveryMethod === 'pickup' && (
                  <>
                    <div>
                      <label className="block text-xs tracking-widest text-moon-muted mb-3">
                        取貨日期 *
                      </label>
                      <input
                        {...register('pickup_date', {
                          required: '請選擇取貨日期',
                          validate: (value) => {
                            const dateInfo = isDateAvailable(value);
                            if (!dateInfo.available) {
                              return dateInfo.reason || '此日期無法預訂';
                            }
                            return true;
                          },
                        })}
                        type="date"
                        min={getMinPickupDate()}
                        max={getMaxPickupDate()}
                        className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-muted focus:outline-none transition-colors"
                      />
                      {errors.pickup_date && (
                        <p className="text-red-400 text-xs mt-2">
                          {errors.pickup_date.message}
                        </p>
                      )}
                      {dateValidation && !dateValidation.valid && (
                        <p className="text-xs text-red-400 mt-2">
                          ✗ {dateValidation.reason}
                        </p>
                      )}
                      {dateValidation && dateValidation.valid && watch('pickup_date') && (
                        <p className="text-xs text-moon-accent/80 mt-2">
                          ✓ 此日期可預訂
                        </p>
                      )}
                      {!watch('pickup_date') && reservationRules && (
                        <p className="text-xs text-moon-muted/60 mt-2">
                          📅 需提前 {reservationRules.min_advance_days || 3} 天預訂
                          {reservationRules.allow_rush_orders && ` (急單可加價 ${reservationRules.rush_order_fee_percentage}%)`}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs tracking-widest text-moon-muted mb-3">
                        取貨時間 *
                      </label>
                      <select
                        {...register('pickup_time', {
                          required: '請選擇取貨時間',
                        })}
                        className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-muted focus:outline-none transition-colors"
                      >
                        <option value="">Select time slot</option>
                        <option value="10:00-11:00">10:00 - 11:00</option>
                        <option value="11:00-12:00">11:00 - 12:00</option>
                        <option value="12:00-13:00">12:00 - 13:00</option>
                        <option value="13:00-14:00">13:00 - 14:00</option>
                        <option value="14:00-15:00">14:00 - 15:00</option>
                        <option value="15:00-16:00">15:00 - 16:00</option>
                        <option value="16:00-17:00">16:00 - 17:00</option>
                        <option value="17:00-18:00">17:00 - 18:00</option>
                        <option value="18:00-19:00">18:00 - 19:00</option>
                      </select>
                      {errors.pickup_time && (
                        <p className="text-red-400 text-xs mt-2">
                          {errors.pickup_time.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* 宅配：地址和備註 */}
                {watchedDeliveryMethod === 'delivery' && (
                  <>
                    <div>
                      <label className="block text-xs tracking-widest text-moon-muted mb-3">
                        預計出貨日期 *
                      </label>
                      <input
                        {...register('pickup_date', {
                          required: '請選擇預計出貨日期',
                          validate: (value) => {
                            const dateInfo = isDateAvailable(value);
                            if (!dateInfo.available) {
                              return dateInfo.reason || '此日期無法預訂';
                            }
                            return true;
                          },
                        })}
                        type="date"
                        min={getMinPickupDate()}
                        max={getMaxPickupDate()}
                        className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-muted focus:outline-none transition-colors"
                      />
                      {errors.pickup_date && (
                        <p className="text-red-400 text-xs mt-2">
                          {errors.pickup_date.message}
                        </p>
                      )}
                      {watch('pickup_date') && isDateAvailable(watch('pickup_date')).available && (
                        <p className="text-xs text-moon-accent/80 mt-2">
                          ✓ 此日期可出貨
                        </p>
                      )}
                      {watch('pickup_date') && !isDateAvailable(watch('pickup_date')).available && (
                        <p className="text-xs text-red-400 mt-2">
                          ✗ {isDateAvailable(watch('pickup_date')).reason || '此日期無法出貨'}
                        </p>
                      )}
                      {!watch('pickup_date') && (
                        <p className="text-xs text-moon-muted/60 mt-2">
                          最早可預訂日期為 {getMinPickupDate()}（今天起三天後）
                          {loadingDates && <span className="ml-2">載入中...</span>}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs tracking-widest text-moon-muted mb-3">
                        取貨時間（宅配時段）
                      </label>
                      <select
                        {...register('pickup_time', {
                          required: false,
                        })}
                        className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-muted focus:outline-none transition-colors"
                      >
                        <option value="不指定">不指定時段</option>
                        <option value="上午">上午 (09:00-12:00)</option>
                        <option value="下午">下午 (12:00-18:00)</option>
                        <option value="晚上">晚上 (18:00-21:00)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs tracking-widest text-moon-muted mb-3">
                        收件地址 *
                      </label>
                      <textarea
                        {...register('delivery_address', {
                          required: deliveryMethod === 'delivery' ? '請輸入收件地址' : false,
                          minLength: { value: 10, message: '地址至少 10 個字' },
                        })}
                        rows={3}
                        className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-muted focus:outline-none transition-colors resize-none"
                        placeholder="請輸入完整地址（含郵遞區號）"
                      />
                      {errors.delivery_address && (
                        <p className="text-red-400 text-xs mt-2">
                          {errors.delivery_address.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs tracking-widest text-moon-muted mb-3">
                        宅配備註（選填）
                      </label>
                      <textarea
                        {...register('delivery_notes')}
                        rows={2}
                        className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-muted focus:outline-none transition-colors resize-none"
                        placeholder="例如：請放管理室、請按門鈴等"
                      />
                    </div>
                  </>
                )}

                {/* 預計轉帳日期 */}
                <div className="bg-moon-black/50 border border-moon-accent/30 p-4 rounded">
                  <label className="block text-xs tracking-widest text-moon-accent mb-3">
                    💳 預計轉帳日期 *
                  </label>
                  <input
                    {...register('payment_date', {
                      required: '請選擇預計轉帳日期',
                    })}
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-accent focus:outline-none transition-colors"
                  />
                  {errors.payment_date && (
                    <p className="text-red-400 text-xs mt-2">
                      {errors.payment_date.message}
                    </p>
                  )}
                  <p className="text-xs text-moon-muted/80 mt-2 leading-relaxed">
                    請選擇您預計完成轉帳的日期，方便我們追蹤訂單狀態
                  </p>
                </div>

                {/* 提交按鈕 */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-moon-accent text-moon-black py-3 sm:py-4 text-xs sm:text-sm tracking-widest hover:bg-moon-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 mt-6 sm:mt-8"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span className="hidden sm:inline">PROCESSING...</span>
                      <span className="sm:hidden">處理中...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">PLACE ORDER</span>
                      <span className="sm:hidden">確認訂單</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
