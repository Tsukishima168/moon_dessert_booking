'use client';

import { Suspense, useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';
import ProductListItem from '@/components/ProductListItem';
import ProductRow from '@/components/ProductRow';
import Banner from '@/components/Banner';
import { MenuSkeleton } from '@/components/ui/MenuSkeleton';
import Reveal from '@/components/ui/Reveal';
import { MenuItemWithVariants, MenuCategory } from '@/lib/supabase';
import { SHOP_ATTRIBUTION_STORAGE_KEY } from '@/lib/shop-analytics';
import MemberPassportLink from '@/components/MemberPassportLink';
import { AlertCircle, ArrowRight, Search, X, MapPin, PackageCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const CATEGORY_LABELS: Record<string, string> = {
  tiramisu: '提拉米蘇', basque: '巴斯克乳酪', chiffon: '戚風蛋糕',
  mille_crepe: '千層蛋糕', pudding: '布丁與單點', drinks: '飲品',
};
const categoryLabel = (category: MenuCategory) => CATEGORY_LABELS[category.id] || category.name;

type ShopWindow = Window & {
  __SHOP_INITIAL_SEARCH__?: string;
};

const getInitialUrlSearch = (searchParams: ReturnType<typeof useSearchParams>) => {
  if (typeof window === 'undefined') {
    const renderedSearch = searchParams?.toString() ?? '';
    return renderedSearch ? `?${renderedSearch}` : '';
  }

  return (window as ShopWindow).__SHOP_INITIAL_SEARCH__ || window.location.search;
};

function HomePageContent() {
  const searchParams = useSearchParams();
  const initialSearch = getInitialUrlSearch(searchParams);
  const initialParams = new URLSearchParams(initialSearch);
  const mbtiType = searchParams?.get('mbti') || initialParams.get('mbti');
  const searchParamsKey = initialSearch || searchParams?.toString() || '';

  const [menuItems, setMenuItems] = useState<MenuItemWithVariants[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 前端搜尋過濾（不重新呼叫 API）
  const filteredMenuItems = searchQuery.trim()
    ? menuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (item.description?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ?? false)
      )
    : menuItems;

  // 取得菜單資料和分類
  useEffect(() => {
    async function fetchData() {
      try {
        // 帶上 MBTI 參數
        const menuUrl = mbtiType
          ? `/api/menu?mbti=${mbtiType}`
          : '/api/menu';

        // 同時取得菜單和分類
        const [menuResponse, categoriesResponse] = await Promise.all([
          fetch(menuUrl),
          fetch('/api/categories'),
        ]);

        const menuData = await menuResponse.json();
        const categoriesData = await categoriesResponse.json();

        if (menuData.success) {
          setMenuItems(menuData.data);
        } else {
          setError(menuData.message);
        }

        if (categoriesData.success) {
          setCategories(categoriesData.data);
        }
      } catch (err) {
        console.error('取得資料失敗:', err);
        setError('無法載入菜單，請稍後再試');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [mbtiType]);

  // 按分類分組商品（依搜尋結果過濾）
  const getItemsByCategory = (categoryId: string) => {
    return filteredMenuItems.filter((item) => item.category === categoryId);
  };

  // 取得推薦商品（依搜尋結果過濾）
  const recommendedItems = filteredMenuItems.filter(item => item.recommended);

  // 來源感知（from: moon-map / passport / lab）
  const fromSource = initialParams.get('from') || searchParams?.get('from');
  const sourceSite = fromSource?.startsWith('passport_') ? 'passport'
    : fromSource?.startsWith('map_') ? 'map'
    : fromSource?.startsWith('mbti_') ? 'mbti' : fromSource;

  // 保存來源與 UTM（供結帳使用）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const attributionParams = new URLSearchParams(initialSearch);
    const originalLandingUrl = `${window.location.origin}${window.location.pathname}${initialSearch}${window.location.hash}`;
    const utm_source = attributionParams.get('utm_source') || null;
    const utm_medium = attributionParams.get('utm_medium') || null;
    const utm_campaign = attributionParams.get('utm_campaign') || null;
    const utm_content = attributionParams.get('utm_content') || null;
    const utm_term = attributionParams.get('utm_term') || null;

    const hasAttribution = Boolean(
      fromSource || mbtiType || utm_source || utm_medium || utm_campaign || utm_content || utm_term
    );

    if (hasAttribution) {
      localStorage.setItem(
        SHOP_ATTRIBUTION_STORAGE_KEY,
        JSON.stringify({
          from: fromSource || null,
          mbti: mbtiType || null,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          landing_url: originalLandingUrl,
          captured_at: new Date().toISOString(),
        })
      );
    }
  }, [searchParamsKey, fromSource, mbtiType, initialSearch]);

  const sourceNote = sourceSite === 'passport'
    ? '從會員中心回來，為下一次到店選一份甜點。'
    : sourceSite === 'moon-map' || sourceSite === 'map'
      ? '從島嶼地圖走進來，把喜歡的風景帶進日常。'
      : sourceSite === 'lab' || sourceSite === 'mbti' || mbtiType
        ? '從人格測驗走過來，慢慢找一款喜歡的口味。'
        : '選一份喜歡的甜點，留給自己，也留給想念的人。';

  const featuredItems = menuItems
    .filter(item => item.is_available && item.variants?.length > 0 && !/drink|飲品|飲料/i.test(item.category || ''))
    .slice(0, 4);
  const heroItem = featuredItems.find(item => item.image_url?.trim());

  if (loading) {
    return (
      <div className="min-h-screen bg-moon-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          {/* Hero 骨架 */}
          <div className="flex flex-col items-center gap-4 mb-12 sm:mb-16">
            <div className="skeleton h-16 w-44 sm:h-20 sm:w-56" />
            <div className="skeleton h-4 w-56 sm:w-72" />
            <div className="skeleton h-3 w-40" />
            <div className="skeleton h-11 w-60 mt-4" />
          </div>
          {/* 菜單骨架 */}
          <MenuSkeleton rows={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-moon-black flex items-center justify-center p-4">
        <div className="border border-moon-border bg-moon-dark p-12 max-w-md text-center">
          <AlertCircle className="text-moon-muted mx-auto mb-4" size={48} />
          <h2 className="text-xl font-light text-moon-accent mb-4 tracking-wide">
            無法載入
          </h2>
          <p className="text-sm text-moon-muted mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="border border-moon-border text-moon-text px-8 py-3 text-sm tracking-widest hover:bg-moon-border transition-colors"
          >
            重新載入頁面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-home min-h-screen bg-moon-black">
      <section className="shop-hero">
        <div className="shop-container shop-hero-grid">
          <div className="shop-hero-copy">
            <p className="shop-eyebrow">MOON MOON · 月島甜點</p>
            <h1>把日常，<br />留一口甜。</h1>
            <p className="shop-hero-description">{sourceNote}</p>
            <p className="shop-hero-detail">看口味、選規格，再確認適合你的取貨方式。</p>
            <a href="#menu-section" className="shop-primary">選購甜點 <ArrowRight size={18} aria-hidden="true" /></a>
            <div className="shop-hero-links">
              <Link href="/shipping"><PackageCheck size={16} aria-hidden="true" /> 取貨與配送</Link>
              <Link href="/location"><MapPin size={16} aria-hidden="true" /> 門市資訊</Link>
            </div>
          </div>
          {heroItem && (
            <Link href={`/product/${heroItem.slug || heroItem.id}`} className="shop-hero-photo">
              <div className="shop-hero-image">
                <Image src={heroItem.image_url} alt={heroItem.name} fill priority sizes="(max-width: 767px) calc(100vw - 40px), 50vw" className="object-cover" />
              </div>
              <div className="shop-hero-caption"><span>{heroItem.name}</span><span>看看這款 <ArrowRight size={16} aria-hidden="true" /></span></div>
            </Link>
          )}
        </div>
      </section>

      <div className="shop-container shop-announcement"><Banner /></div>

      <section id="menu-section" className="shop-container shop-menu">
        <div className="shop-menu-heading">
          <div><p className="shop-eyebrow">DESSERT SELECTION</p><h2>慢慢選一份喜歡的。</h2><p>品項、規格與價格，以各款甜點頁面為準。</p></div>
          <div className="shop-search">
            <label htmlFor="dessert-search" className="sr-only">搜尋甜點</label>
            <Search size={18} aria-hidden="true" />
            <input id="dessert-search" type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="找甜點或口味" />
            {searchQuery && <button type="button" aria-label="清除搜尋" onClick={() => setSearchQuery('')}><X size={18} /></button>}
          </div>
        </div>
        {searchQuery && <p className="shop-search-result" role="status">找到 {filteredMenuItems.length} 款符合「{searchQuery}」的品項</p>}

        {!searchQuery && !mbtiType && featuredItems.length > 0 && (
          <div className="shop-featured-grid">
            {featuredItems.map(item => (
              <Link key={item.id} href={`/product/${item.slug || item.id}`} className="shop-featured-card">
                <div className="shop-featured-image">{item.image_url?.trim() ? <Image src={item.image_url} alt={item.name} fill sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 25vw" className="object-cover" /> : <span>甜點照片準備中</span>}</div>
                <div className="shop-featured-copy"><h3>{item.name}</h3><p>NT$ {Math.min(...item.variants.map(v => v.price)).toLocaleString('zh-TW')}{item.variants.length > 1 ? ' 起' : ''}</p><span>選擇規格 <ArrowRight size={15} aria-hidden="true" /></span></div>
              </Link>
            ))}
          </div>
        )}

        {mbtiType && recommendedItems.length > 0 && (
          <section className="shop-recommendations">
            <h2>給 {mbtiType} 的口味靈感</h2><p>推薦只是起點，喜歡什麼口味由你決定。</p>
            <div className="shop-product-list md:hidden">{recommendedItems.map(item => <ProductListItem key={item.id} item={item} />)}</div>
            <div className="shop-product-list hidden md:block">{recommendedItems.map((item, i) => <ProductRow key={item.id} item={item} index={i} />)}</div>
          </section>
        )}

        <div className="shop-catalog-heading"><h2>全部甜點與飲品</h2><span>展開品項，選規格與數量</span></div>
        {categories.length > 0 && <nav className="shop-category-nav" aria-label="甜點分類">{categories.filter(category => getItemsByCategory(category.id).length > 0).map(category => <a key={category.id} href={`#category-${category.id}`}>{categoryLabel(category)}</a>)}</nav>}
        {filteredMenuItems.length === 0 && searchQuery && <div className="shop-no-results"><p>沒有找到這個口味。</p><button type="button" onClick={() => setSearchQuery('')}>查看全部甜點</button></div>}
        {categories.length === 0 ? (
          <>
            <div className="shop-product-list md:hidden">{filteredMenuItems.map(item => <ProductListItem key={item.id} item={item} />)}</div>
            <div className="shop-product-list hidden md:block">{filteredMenuItems.map((item, i) => <ProductRow key={item.id} item={item} index={i} />)}</div>
          </>
        ) : (
          <div className="shop-categories">{categories.map(category => {
            const categoryItems = getItemsByCategory(category.id);
            if (!categoryItems.length) return null;
            const isDrinkCategory = /drink|飲品|飲料/i.test(category.name);
            return (
              <Reveal key={category.id} className="shop-category-section">
                <div id={`category-${category.id}`} className="shop-category-title"><h3>{categoryLabel(category)}</h3><span>{categoryItems.length} 款</span></div>
                <div className="shop-product-list md:hidden">{categoryItems.map(item => <ProductListItem key={item.id} item={item} displayOnly={isDrinkCategory} />)}</div>
                <div className="shop-product-list hidden md:block">{categoryItems.map((item, i) => <ProductRow key={item.id} item={item} displayOnly={isDrinkCategory} index={i} />)}</div>
              </Reveal>
            );
          })}</div>
        )}
        {menuItems.length === 0 && <div className="shop-no-results"><p>目前沒有可預訂的甜點。</p><a href="https://line.me/R/ti/p/@931cxefd" target="_blank" rel="noopener noreferrer">詢問月島甜點</a></div>}
      </section>

      <section className="shop-order-guide"><div className="shop-container">
        <p className="shop-eyebrow">HOW TO ORDER</p><h2>把甜點帶回去，很簡單。</h2>
        <ol><li><span>01</span><div><h3>選甜點與規格</h3><p>先看看口味、份量與預訂資訊。</p></div></li><li><span>02</span><div><h3>加入購物車</h3><p>確認數量，再一起前往結帳。</p></div></li><li><span>03</span><div><h3>確認取貨方式</h3><p>結帳時選擇可用的方式與日期。</p></div></li></ol>
        <div className="shop-guide-links"><Link href="/shipping">查看取貨說明 <ArrowRight size={16} aria-hidden="true" /></Link><MemberPassportLink surface="home" /></div>
      </div></section>
      <section className="shop-story shop-container"><div><p className="shop-eyebrow">A LITTLE MOMENT ON THE ISLAND</p><h2>留一點時間，給喜歡的事。</h2><p>從一份甜點開始，也可以到月島地圖走走，或回會員中心看看自己的收藏。</p></div><Link href="/about">認識月島 <ArrowRight size={17} aria-hidden="true" /></Link></section>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-moon-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-moon-accent mx-auto mb-4 w-12 h-12 border-2 border-moon-accent border-t-transparent rounded-full" />
            <p className="text-sm text-moon-muted tracking-widest">甜點準備中…</p>
          </div>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
