import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  variant_name?: string; // 變體名稱（例如：大杯、小杯）
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  promoCode: string | null;
  discountAmount: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  setPromoCode: (code: string | null, discount: number) => void;
  clearPromoCode: () => void;
  getFinalPrice: () => number;
  normalizePrices: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      promoCode: null,
      discountAmount: 0,

      // 新增商品到購物車
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          
          if (existingItem) {
            // 如果商品已存在，增加數量
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          } else {
            // 新增商品，數量為 1
            return {
              items: [...state.items, { ...item, quantity: 1 }],
            };
          }
        });
      },

      // 移除商品
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      // 更新商品數量
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }));
      },

      // 清空購物車
      clearCart: () => {
        set({ items: [], promoCode: null, discountAmount: 0 });
      },

      // 切換購物車顯示狀態
      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      // 打開購物車
      openCart: () => {
        set({ isOpen: true });
      },

      // 關閉購物車
      closeCart: () => {
        set({ isOpen: false });
      },

      // 將歷史資料中的價格字串轉成數字，避免 NaN
      normalizePrices: () => {
        set((state) => ({
          items: state.items.map((item) => {
            const raw = item.price as any;
            const num =
              typeof raw === 'number'
                ? raw
                : Number(String(raw).replace(/[^0-9.]/g, '')) || 0;
            return { ...item, price: Number.isNaN(num) ? 0 : num };
          }),
        }));
      },

      // 計算總價
      getTotalPrice: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + Number(item.price || 0) * item.quantity,
          0
        );
      },

      // 計算總商品數
      getTotalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },

      // 設定優惠碼
      setPromoCode: (code, discount) => {
        set({ promoCode: code, discountAmount: discount });
      },

      // 清除優惠碼
      clearPromoCode: () => {
        set({ promoCode: null, discountAmount: 0 });
      },

      // 計算折扣後價格
      getFinalPrice: () => {
        const state = get();
        const originalPrice = state.getTotalPrice();
        const discount = Number(state.discountAmount || 0);
        return Math.max(0, originalPrice - (Number.isNaN(discount) ? 0 : discount));
      },
    }),
    {
      name: 'dessert-cart-storage', // localStorage key
    }
  )
);
