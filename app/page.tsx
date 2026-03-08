'use client';

import { useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';
import ProductListItem from '@/components/ProductListItem';
import ProductRow from '@/components/ProductRow';
import Banner from '@/components/Banner';
import { MenuItemWithVariants, MenuCategory } from '@/lib/supabase';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  const searchParams = useSearchParams();
  const mbtiType = searchParams?.get('mbti');
  const searchParamsKey = searchParams?.toString() ?? '';

  const [menuItems, setMenuItems] = useState<MenuItemWithVariants[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // 按分類分組商品
  const getItemsByCategory = (categoryId: string) => {
    return menuItems.filter((item) => item.category === categoryId);
  };

  // 取得推薦商品
  const recommendedItems = menuItems.filter(item => item.recommended);

  // 來源感知（from: moon-map / passport / lab）
  const fromSource = searchParams?.get('from');

  // 保存來源與 UTM（供結帳使用）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const utm_source = searchParams?.get('utm_source') || null;
    const utm_medium = searchParams?.get('utm_medium') || null;
    const utm_campaign = searchParams?.get('utm_campaign') || null;
    const utm_content = searchParams?.get('utm_content') || null;
    const utm_term = searchParams?.get('utm_term') || null;

    const hasAttribution = Boolean(
      fromSource || mbtiType || utm_source || utm_medium || utm_campaign || utm_content || utm_term
    );

    if (hasAttribution) {
      localStorage.setItem(
        'moonmoon_attribution',
        JSON.stringify({
          from: fromSource || null,
          mbti: mbtiType || null,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          landing_url: window.location.href,
          captured_at: new Date().toISOString(),
        })
      );
    }
  }, [searchParamsKey, fromSource, mbtiType]);

  const getSourceMeta = () => {
    if (fromSource === 'moon-map' || fromSource === 'map') {
      return {
        label: 'FROM MOON MAP',
        title: '你剛從展覽地圖，走進月島裡負責做甜點的這一格房間。',
        desc: '月島本質上仍是一間甜點店，只是我們先從情緒與行動出發，再慢慢長出對應的那一塊甜點。',
      };
    }
    if (fromSource === 'passport') {
      return {
        label: 'FROM DESSERT PASSPORT',
        title: '你的甜點護照已蓋章，接下來換成真正可以帶走的實體。',
        desc: '剛才那些題目，其實都是在幫我們確認：你最近比較需要哪一種情緒被安放在甜點裡。',
      };
    }
    if (fromSource === 'lab' || mbtiType) {
      return {
        label: 'FROM KIWIMU MBTI LAB',
        title: '人格實驗室的檔案，被翻譯成可以一口一口吃掉的東西。',
        desc: 'Kiwimu 幫你整理的那些標籤，在這裡會對應到幾種「適合現在的你」的口感與份量，而不是隨機的甜味。',
      };
    }
    return {
      label: 'MOON MOON DESSERT STUDIO',
      title: '月島還是一間甜點店，只是我們先問：你現在是什麼狀態？',
      desc: '甜點在這裡不是只有口味，而是用來滿足某種情緒和即將發生的行動。你可以把它想成，為那個時刻準備的一個可食的道具。',
    };
  };

  const sourceMeta = getSourceMeta();

  if (loading) {
    return (
      <div className="min-h-screen bg-moon-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-moon-accent mx-auto mb-4" size={48} />
          <p className="text-sm text-moon-muted tracking-widest">載入中...</p>
          <p className="text-xs text-moon-muted mt-4">正在載入甜點目錄，請稍候</p>
        </div>
      </div>
    );
  }

  // Debug: 顯示載入的資料
  console.log('Menu Items:', menuItems.length);
  console.log('Categories:', categories.length);

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
    <div className="min-h-screen bg-moon-black">
      {/* Hero Section - 來源感知 + 三入口 */}
      <div className="border-b border-moon-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
          {/* 上方：Logo + 來源標籤 */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 sm:mb-7 flex justify-center">
              <Image
                src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png"
                alt="月島甜點"
                width={300}
                height={100}
                className="h-16 sm:h-20 lg:h-24 w-auto"
                priority
              />
            </div>

            <div className="mb-4 sm:mb-6">
              <span className="inline-flex items-center gap-2 border border-moon-border/80 bg-moon-dark/60 px-4 sm:px-5 py-2">
                <span className="w-1 h-4 bg-moon-accent" />
                <span className="text-[10px] sm:text-xs tracking-[0.25em] text-moon-muted/80">
                  {sourceMeta.label}
                </span>
              </span>
            </div>

            {/* Banner 推廣區塊 */}
            <Banner />

            {/* 主敘事文字 */}
            <div className="max-w-3xl mx-auto mb-6 sm:mb-8">
              <h1 className="text-base sm:text-lg lg:text-xl font-light text-moon-accent tracking-[0.25em] mb-3 sm:mb-4">
                DESSERT STUDIO
              </h1>
              <p className="text-sm sm:text-base text-moon-text/90 leading-relaxed sm:leading-relaxed">
                {sourceMeta.title}
              </p>
              <p className="mt-3 text-[11px] sm:text-xs text-moon-muted/80 leading-relaxed">
                {sourceMeta.desc}
              </p>
            </div>

            {/* MBTI 個性化標語（若有） */}
            {mbtiType && (
              <div className="mb-6 sm:mb-8 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 border border-moon-border/80 bg-moon-black/40">
                  <div className="flex items-center gap-2 shrink-0">
                    <Sparkles size={14} className="text-moon-accent sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-xs tracking-[0.25em] text-moon-accent whitespace-nowrap">
                      FOR {mbtiType}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-moon-muted tracking-wide">
                    已為你整理 {recommendedItems.length} 款較貼近你狀態的甜點作品。
                  </p>
                </div>
              </div>
            )}

            {/* 三入口：逛展 / 測驗 / 直接預訂 */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
              <Link
                href="https://map.kiwimu.com"
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 sm:flex-none sm:min-w-[180px] border border-moon-border text-moon-text px-3 sm:px-4 py-3 text-[10px] sm:text-xs tracking-[0.25em] hover:bg-moon-border/60 transition-colors text-center"
              >
                逛展覽地圖
              </Link>

              <Link
                href="https://passport.kiwimu.com"
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 sm:flex-none sm:min-w-[200px] border border-moon-border/80 text-moon-text px-3 sm:px-4 py-3 text-[10px] sm:text-xs tracking-[0.25em] hover:bg-moon-border/40 transition-colors text-center"
              >
                甜點護照 · 快速測驗
              </Link>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('menu-section');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="min-w-0 sm:flex-none sm:min-w-[180px] bg-moon-accent text-moon-black px-3 sm:px-4 py-3 text-[10px] sm:text-xs tracking-[0.25em] hover:bg-moon-text transition-colors"
              >
                直接預訂本季甜點
              </button>
            </div>

            <div className="w-12 sm:w-16 h-px bg-moon-border mx-auto mt-8 sm:mt-10"></div>
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <div
        id="menu-section"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16"
      >
        {/* 選購引導（不擅長網路的人也能輕鬆跟上） */}
        <div className="mb-8 sm:mb-12 p-4 sm:p-6 border border-moon-border/60 bg-moon-dark/30">
          <p className="text-xs sm:text-sm text-moon-muted text-center leading-relaxed">
            <span className="text-moon-accent">三步驟完成預訂：</span>① 選擇喜歡的甜點與規格 → ② 點「加入購物車」→ ③ 前往結帳填寫資料
          </p>
        </div>

        {/* MBTI 推薦區塊 - 卡片式展示 */}
        {mbtiType && recommendedItems.length > 0 && (
          <div className="mb-16 sm:mb-24">
            <div className="mb-8 sm:mb-12 text-center">
              <div className="flex items-center justify-center gap-3 sm:gap-6 mb-3 sm:mb-4">
                <div className="h-px bg-moon-border flex-1 max-w-[100px] sm:max-w-xs"></div>
                <h2 className="text-xl sm:text-2xl font-light text-moon-accent tracking-widest flex items-center gap-2 sm:gap-3">
                  <Sparkles size={16} className="sm:w-5 sm:h-5" />
                  為您推薦
                </h2>
                <div className="h-px bg-moon-border flex-1 max-w-[100px] sm:max-w-xs"></div>
              </div>
              <p className="text-xs text-moon-muted tracking-widest px-4">
                根據您的 {mbtiType} 人格特質精選 - 點擊查看詳情
              </p>
            </div>

            {/* 推薦商品列表 */}
            {/* Mobile: List */}
            <div className="md:hidden border border-moon-border bg-moon-dark">
              {recommendedItems.map((item) => (
                <ProductListItem key={item.id} item={item} />
              ))}
            </div>
            {/* Desktop: Row List */}
            <div className="hidden md:block border border-moon-border/40 bg-moon-dark/30">
              {recommendedItems.map((item, i) => (
                <ProductRow key={item.id} item={item} index={i} />
              ))}
            </div>

            <div className="mt-12 sm:mt-16 border-t border-moon-border pt-12 sm:pt-16">
              <h2 className="text-lg sm:text-xl font-light text-moon-muted text-center mb-8 sm:mb-12 tracking-wider px-4">
                或瀏覽所有商品
              </h2>
            </div>
          </div>
        )}

        {/* 本季精選（無 MBTI 時顯示前幾項推薦或熱門） */}
        {!mbtiType && menuItems.length > 0 && (
          <div className="mb-16 sm:mb-24">
            <div className="mb-8 sm:mb-12 text-center">
              <div className="flex items-center justify-center gap-3 sm:gap-6 mb-3 sm:mb-4">
                <div className="h-px bg-moon-border flex-1 max-w-[100px] sm:max-w-xs"></div>
                <h2 className="text-xl sm:text-2xl font-light text-moon-accent tracking-widest">
                  本季精選 · 人氣預訂
                </h2>
                <div className="h-px bg-moon-border flex-1 max-w-[100px] sm:max-w-xs"></div>
              </div>
              <p className="text-xs text-moon-muted tracking-widest px-4">
                不確定選什麼？試試這些熱門品項
              </p>
            </div>
            {/* 顯示前 4 個有規格可預訂的商品 */}
            {(() => {
              const featured = menuItems
                .filter(i => i.is_available && i.variants?.length > 0 && !/drink|飲品|飲料/i.test(i.category || ''))
                .slice(0, 4);
              if (featured.length === 0) return null;
              return (
                <>
                  <div className="md:hidden border border-moon-border bg-moon-dark">
                    {featured.map(item => <ProductListItem key={item.id} item={item} />)}
                  </div>
                  <div className="hidden md:block border border-moon-border/40 bg-moon-dark/30">
                    {featured.map((item, i) => <ProductRow key={item.id} item={item} index={i} />)}
                  </div>
                  <div className="mt-12 sm:mt-16 border-t border-moon-border pt-12 sm:pt-16">
                    <h2 className="text-lg sm:text-xl font-light text-moon-muted text-center mb-8 sm:mb-12 tracking-wider px-4">
                      瀏覽全部商品
                    </h2>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {categories.length === 0 ? (
          // 如果沒有分類，顯示所有商品
          <>
            {/* Mobile: 列表式 */}
            <div className="md:hidden border border-moon-border bg-moon-dark">
              {menuItems.map((item) => (
                <ProductListItem key={item.id} item={item} />
              ))}
            </div>
            {/* Desktop: Row List */}
            <div className="hidden md:block border border-moon-border/40 bg-moon-dark/30">
              {menuItems.map((item, i) => (
                <ProductRow key={item.id} item={item} index={i} />
              ))}
            </div>
          </>
        ) : (
          // 按分類分組顯示
          <div className="space-y-8 sm:space-y-16">
            {categories.map((category) => {
              const categoryItems = getItemsByCategory(category.id);

              // 如果該分類沒有商品，跳過
              if (categoryItems.length === 0) return null;

              const isDrinkCategory =
                category.name.toLowerCase().includes('drink') ||
                category.name.includes('飲品') ||
                category.name.includes('飲料');

              return (
                <div key={category.id} className="category-section">
                  {/* 分類標題 */}
                  <div className="mb-6 px-4 sm:px-0">
                    <div className="flex items-center gap-4 mb-2">
                      {/* 裝飾線 - 左 */}
                      <div className="hidden sm:block h-px bg-moon-border w-8"></div>
                      <h2 className="text-lg sm:text-xl font-light text-moon-accent tracking-widest whitespace-nowrap">
                        {category.name.toUpperCase()}
                      </h2>
                      <div className="h-px bg-moon-border flex-1"></div>
                      <span className="text-xs text-moon-muted tracking-wider">
                        {categoryItems.length} 款
                      </span>
                    </div>
                  </div>

                  {/* 商品列表 - Mobile (List) */}
                  <div className="md:hidden border border-moon-border bg-moon-dark">
                    {categoryItems.map((item) => (
                      <ProductListItem
                        key={item.id}
                        item={item}
                        displayOnly={isDrinkCategory}
                      />
                    ))}
                  </div>

                  {/* 商品列表 - Desktop (Row List) */}
                  <div className="hidden md:block border border-moon-border/40 bg-moon-dark/30">
                    {categoryItems.map((item, i) => (
                      <ProductRow
                        key={item.id}
                        item={item}
                        displayOnly={isDrinkCategory}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 如果沒有任何商品 */}
        {menuItems.length === 0 && !loading && (
          <div className="text-center py-32">
            <div className="text-2xl mb-6 opacity-20">—</div>
            <p className="text-sm text-moon-muted tracking-wider mb-4">目前沒有可預訂的商品</p>
            <p className="text-xs text-moon-muted/60 max-w-md mx-auto">請稍後再來看看，或聯繫我們了解更多</p>
          </div>
        )}
      </div>

      {/* Kiwimu 故事區塊 */}
      <section className="border-t border-moon-border/60 bg-moon-dark/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start lg:items-center">
            {/* 左側：Logo 或象徵圖 */}
            <div className="w-full lg:w-auto flex justify-center lg:justify-start">
              <div className="inline-flex flex-col items-center gap-3">
                <Image
                  src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768736617/mbti_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F_1_zpt5jq.webp"
                  alt="Kiwimu Lab"
                  width={120}
                  height={120}
                  className="h-16 sm:h-20 w-auto opacity-80"
                />
                <span className="text-[10px] sm:text-xs tracking-[0.25em] text-moon-muted/70">
                  KIWIMU MBTI LAB
                </span>
              </div>
            </div>

            {/* 右側：文字敘事 */}
            <div className="flex-1 text-left">
              <p className="text-[11px] sm:text-xs tracking-[0.25em] text-moon-muted/70 mb-3">
                STORY BEHIND THE BRIDGE
              </p>
              <h2 className="text-sm sm:text-base lg:text-lg font-light text-moon-text/90 leading-relaxed mb-3">
                Kiwimu 不是一個品牌，而是一團從鮮奶油誕生、會融化又重組的奶霜生物。
              </h2>
              <p className="text-xs sm:text-sm text-moon-muted/90 leading-relaxed mb-2">
                牠沒有固定形狀，情緒一來就會融化；願意停下來面對、命名、整理，牠就又能被重新打發成形。
                在 Kiwimu 的實驗室裡，我們做的事很單純：先陪你看見自己現在的狀態，再想像一塊適合這個狀態的甜點。
              </p>
              <p className="text-xs sm:text-sm text-moon-muted/80 leading-relaxed mb-4">
                測驗和標籤不是最後的答案，只是一面鏡子；Kiwimu 的角色，是在每一個階段提醒你：
                「成長不是變堅硬，而是學會柔軟地存在。」你現在打開的這個預訂頁，則是那面鏡子在月島裡的其中一個出口。
              </p>

              <Link
                href="https://kiwimu.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-moon-border/80 px-4 py-2 text-[11px] sm:text-xs tracking-[0.25em] text-moon-text hover:bg-moon-border/40 transition-colors"
              >
                前往 Kiwimu 人格實驗室
                <span className="text-[10px]">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-moon-border mt-0 sm:mt-4 lg:mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          {/* IP LOGO */}
          <div className="mb-6 sm:mb-8 flex justify-center">
            <Image
              src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768736617/mbti_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F_1_zpt5jq.webp"
              alt="Kiwimu"
              width={120}
              height={120}
              className="h-20 sm:h-24 w-auto opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>

          {/* 導航連結 */}
          <div className="mb-6 sm:mb-8">
            <a
              href="https://map.kiwimu.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs sm:text-sm tracking-widest text-moon-muted hover:text-moon-accent transition-colors"
            >
              <span>探索月島展覽地圖 →</span>
            </a>
          </div>

          {/* 分隔線 */}
          <div className="w-12 sm:w-16 h-px bg-moon-border mx-auto mb-6 sm:mb-8"></div>

          {/* 品牌標誌 */}
          <div className="mb-4 flex justify-center">
            <Image
              src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png"
              alt="月島甜點"
              width={150}
              height={50}
              className="h-8 w-auto opacity-60"
            />
          </div>

          {/* 版權資訊 */}
          <p className="text-xs text-moon-muted tracking-widest mb-2">© 2024 MOON MOON DESSERT</p>
          <p className="text-xs text-moon-muted/60">安南區本原街・果菜市場周邊療癒系甜點</p>
        </div>
      </footer>
    </div>
  );
}
