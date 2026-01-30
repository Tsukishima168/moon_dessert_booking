## 📄 頁面 SEO 配置總結

### ✅ 已完成的頁面 Metadata

| 頁面 | 路徑 | Title | Index | 說明 |
|------|------|-------|-------|------|
| **全站預設** | `*` | MOON MOON \| 月島甜點訂購 | ✅ Yes | 預設 SEO,Open Graph |
| **結帳頁** | `/checkout` | 結帳 \| 月島甜點 | ❌ No | 避免被搜尋 |
| **後台** | `/admin` | 管理後台 \| 月島甜點 | ❌ No | 完全不索引 |

### 為什麼這樣設計?

#### 1. **首頁使用全站預設 ✅**
- 好處:減少重複,維護簡單
- Open Graph & Twitter Cards 自動套用
- 適合單一產品網站

#### 2. **結帳頁 noindex ❌**
- 避免「空購物車」頁面被 Google 索引
- 避免重複內容問題
- 只讓主頁面獲得 SEO 權重

#### 3. **後台 noindex + nofollow ❌**
- 完全不被搜尋引擎追蹤
- 保護管理介面
- `nocache: true` 避免被快取

### 未來擴充建議

如果之後有**商品詳細頁**,可以使用:

```tsx
// app/product/[id]/page.tsx
export async function generateMetadata({ params }) {
  const product = await getProduct(params.id);
  
  return {
    title: `${product.name} | 月島甜點`,
    description: product.description,
    openGraph: {
      images: [product.image],
    },
  };
}
```

這樣每個商品都有獨立的 SEO!
