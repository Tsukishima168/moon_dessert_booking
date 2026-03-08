# 🎨 設計說明

## 風格定位
**極簡高級 × 療癒系 × 月島美學**

參考來源：[https://map.kiwimu.com](https://map.kiwimu.com)

---

## 🎨 配色方案

### 主色調
```
moon-black:  #0A0A0A  - 主背景
moon-dark:   #141414  - 卡片背景
moon-gray:   #1F1F1F  - 次要背景
moon-border: #2A2A2A  - 邊框
```

### 文字色
```
moon-accent: #FFFFFF  - 主標題、強調
moon-text:   #E5E5E5  - 內文
moon-muted:  #999999  - 次要文字
```

### 特殊色
```
moon-gold:   #D4AF37  - 備用（未使用）
```

---

## 📐 設計原則

### 1. 極簡主義
- ❌ 不使用圓角
- ❌ 不使用陰影（只用 border）
- ❌ 不使用漸層
- ✅ 使用方形元素
- ✅ 使用細邊框
- ✅ 大量留白

### 2. 排版
- 大標題：`font-light` + `tracking-wider`
- 內文：`text-sm` + `leading-relaxed`
- 按鈕/標籤：`text-xs` + `tracking-widest`（大字距）
- 價格：`font-light` + 大字號

### 3. 互動
- Hover：改變 border 顏色（不改背景）
- 過渡：`duration-500`（慢速、優雅）
- 按鈕：方形、無圓角、細邊框

### 4. 間距
- 組件之間：`gap-8`（較大）
- 內容區：`p-6` ~ `p-8`
- 標題下方：`mb-8`（大留白）

---

## 🧩 組件設計

### Navbar
- 固定頂部
- 半透明背景（`bg-opacity-90` + `backdrop-blur-sm`）
- Logo 左、購物車右
- 高度：`h-20`
- 字體：`font-light`

### ProductCard
- 方形
- 圖片區：`h-64`
- 細邊框
- Hover：邊框變亮
- 標籤：方形、細邊框、背景半透明

### CartSidebar
- 從右滑入（`duration-500`）
- 背景半透明遮罩
- 黑色主體 + 細邊框
- 數量控制：方形按鈕 + 細邊框

### Checkout
- 兩欄佈局（Desktop）
- 輸入框：黑色背景 + 細邊框
- Focus：邊框變亮（不改背景）

---

## 🔤 文字風格

### 英文大寫
- 導航文字：`MOON MOON`
- 按鈕：`ADD TO CART`
- 分類：`ALL ITEMS`
- 標籤：`SOLD OUT`

### 中英混合
- 標題：`MOON MOON | 月島甜點訂購`
- 描述：中文段落保持小寫

### 字距
- 標題：`tracking-wider`（0.05em）
- 按鈕/標籤：`tracking-widest`（0.1em）
- 一般文字：預設

---

## 🎭 動畫效果

### 頁面載入
- 淡入：簡單的 opacity 過渡
- 無複雜動畫

### 互動
- Hover：`transition-all`
- 圖片縮放：`scale-105`（緩慢）
- 購物車滑入：`duration-500`

### 避免
- ❌ 跳動（bounce）
- ❌ 旋轉（除了 loading）
- ❌ 彈跳（spring）
- ✅ 保持優雅、緩慢

---

## 📱 響應式

### 斷點
- Mobile: `<768px` - 單欄
- Tablet: `768px-1024px` - 雙欄
- Desktop: `>1024px` - 三欄

### 調整
- 標題：Mobile 較小（`text-3xl` → `text-4xl`）
- 間距：Mobile 較小（`px-4` → `px-6`）
- 網格：Mobile 1 欄、Tablet 2 欄、Desktop 3 欄

---

## 🚫 禁止使用

- ❌ 圓角（`rounded-*`）改用方形
- ❌ 陰影（`shadow-*`）改用 border
- ❌ 漸層（`gradient-*`）改用純色
- ❌ 粗體（`font-bold`）改用 `font-light`
- ❌ 鮮豔色（紅橙黃綠藍）改用灰階
- ❌ 小字距（`tracking-tight`）改用 `tracking-wider`

---

## ✅ 推薦使用

- ✅ 方形元素
- ✅ 細邊框（`border`）
- ✅ 大留白
- ✅ 黑白灰配色
- ✅ 大字距（`tracking-widest`）
- ✅ 輕字重（`font-light`）
- ✅ 緩慢過渡（`duration-500`）
- ✅ 英文大寫

---

## 🎯 關鍵差異點

### 之前（活潑甜點風）
- 🔵 深藍 + 金黃 + 奶油色
- 🔴 圓角（`rounded-2xl`）
- 💫 陰影（`shadow-xl`）
- 🎨 鮮豔色彩
- 🌈 漸層背景

### 現在（極簡藝術館風）
- ⚫ 黑白灰
- ⬜ 方形（無圓角）
- 📏 細邊框
- 🎨 極簡單色
- ⬛ 純色背景

---

## 🌙 Moon Moon 識別元素

1. **月亮 Emoji**: 🌙（用於 Logo、裝飾）
2. **英文大寫**: MOON MOON
3. **字距加寬**: tracking-widest
4. **方形設計**: 所有元素無圓角
5. **深色主調**: 黑色背景為主

---

## 📝 範例程式碼

### 標題
```tsx
<h1 className="text-4xl font-light text-moon-accent tracking-wider">
  MOON MOON
</h1>
```

### 按鈕
```tsx
<button className="border border-moon-border text-moon-text px-8 py-3 text-sm tracking-widest hover:bg-moon-border transition-colors">
  ADD TO CART
</button>
```

### 卡片
```tsx
<div className="border border-moon-border bg-moon-dark hover:border-moon-muted transition-all duration-500">
  {/* 內容 */}
</div>
```

### 輸入框
```tsx
<input className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-muted focus:outline-none transition-colors" />
```

---

## 🎨 如果要微調

### 想要更溫暖
- 加入 `#D4AF37`（金色）作為 accent

### 想要更冷調
- 使用藍灰色（`#1A1F2E`）取代純黑

### 想要更柔和
- 增加透明度（`bg-opacity-95`）
- 使用模糊效果（`backdrop-blur-md`）

---

**設計完成日期**: 2024-01-27
**風格**: Moon Moon × Minimal × Gallery
