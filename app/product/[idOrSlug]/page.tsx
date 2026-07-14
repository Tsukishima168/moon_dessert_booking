import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import Eyebrow from '@/components/ui/Eyebrow';
import SectionHeading from '@/components/ui/SectionHeading';
import ProductNotice from '@/components/ProductNotice';
import ProductPageActions from '@/components/ProductPageActions';
import { getMenuItemBySlugOrId } from '@/lib/supabase';
import type { MenuItemWithVariants } from '@/lib/supabase';
import { getDeliveryTypeLabel } from '@/lib/delivery-type';

// 商品資料（含價格/庫存）可能隨時變動，不做靜態快取，每次請求即時查詢。
export const dynamic = 'force-dynamic';

const SITE_URL = 'https://shop.kiwimu.com';
const SITE_NAME = 'MOON MOON 月島甜點';
const getProduct = cache(getMenuItemBySlugOrId);

interface ProductPageParams {
  params: Promise<{ idOrSlug: string }>;
}

function getMinPrice(item: MenuItemWithVariants): number {
  if (item.variants.length === 0) return item.price;
  return Math.min(...item.variants.map((v) => v.price));
}

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export async function generateMetadata({ params }: ProductPageParams): Promise<Metadata> {
  const { idOrSlug } = await params;
  const item = await getProduct(idOrSlug);

  if (!item) {
    return { title: `找不到商品｜${SITE_NAME}` };
  }

  const rawDescription = item.tagline || item.description || '';
  const description = rawDescription.length > 120
    ? `${rawDescription.slice(0, 120)}…`
    : rawDescription || undefined;
  const canonicalSlug = item.slug || item.id;
  const url = `${SITE_URL}/product/${canonicalSlug}`;

  return {
    title: `${item.name}｜月島甜點`,
    description,
    alternates: { canonical: `/product/${canonicalSlug}` },
    openGraph: {
      title: `${item.name}｜月島甜點 | ${SITE_NAME}`,
      description,
      url,
      type: 'article',
      images: item.image_url ? [{ url: item.image_url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageParams) {
  const { idOrSlug } = await params;
  const item = await getProduct(idOrSlug);

  if (!item) {
    notFound();
  }

  const galleryImages = Array.from(new Set(
    [item.image_url, ...(item.gallery_urls ?? [])]
      .filter((url): url is string => Boolean(url))
  ));

  const minPrice = getMinPrice(item);
  const deliveryLabel = getDeliveryTypeLabel(item.delivery_type);
  const isPickupOnly = item.delivery_type === 'pickup_only';
  const canonicalSlug = item.slug || item.id;
  const productUrl = `${SITE_URL}/product/${canonicalSlug}`;

  const hasSpecs = Boolean(
    item.size_info ||
    item.included_items ||
    item.storage_info ||
    (item.ingredients && item.ingredients.length > 0) ||
    (item.allergens && item.allergens.length > 0)
  );

  const availability = item.is_available && item.variants.length > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    ...(galleryImages.length > 0 ? { image: galleryImages } : {}),
    ...(item.description ? { description: item.description } : {}),
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      price: minPrice,
      priceCurrency: 'TWD',
      availability,
      ...(item.available_until ? { priceValidUntil: item.available_until.slice(0, 10) } : {}),
    },
  };

  return (
    <div className="min-h-screen bg-moon-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productSchema) }}
      />

      {/* 商品主資訊 */}
      <section className="border-b border-moon-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 brand-section">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* 圖片區 */}
            {galleryImages.length > 0 && (
              <div className="space-y-3">
                <div className="relative aspect-square w-full bg-moon-gray overflow-hidden">
                  <Image
                    src={galleryImages[0]}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </div>
                {galleryImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {galleryImages.slice(1).map((url, i) => (
                      <div key={`${url}-${i}`} className="relative aspect-square bg-moon-gray overflow-hidden">
                        <Image
                          src={url}
                          alt={`${item.name} ${i + 2}`}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 文字/購買區 */}
            <div className={galleryImages.length > 0 ? '' : 'md:col-span-2 max-w-2xl'}>
              {item.category && (
                <Eyebrow bordered className="mb-4">
                  {item.category.toUpperCase()}
                </Eyebrow>
              )}

              <h1 className="brand-display text-2xl sm:text-3xl mb-2 leading-snug">
                {item.name}
              </h1>

              {item.tagline && (
                <p className="brand-body text-sm sm:text-base text-moon-muted/90 mb-4">
                  {item.tagline}
                </p>
              )}

              {deliveryLabel && (
                <span
                  className={`inline-block text-[10px] sm:text-xs tracking-widest px-3 py-1 mb-4 border ${isPickupOnly
                      ? 'border-moon-gold text-moon-gold'
                      : 'border-moon-border/60 text-moon-muted'
                    }`}
                >
                  {deliveryLabel}
                </span>
              )}

              <div className="text-xl sm:text-2xl text-moon-accent font-light mb-6">
                <span className="text-xs mr-1">$</span>
                {minPrice}
                {item.variants.length > 1 && (
                  <span className="text-xs text-moon-muted ml-2">起</span>
                )}
              </div>

              {item.description && (
                <p className="brand-body text-sm text-moon-muted/90 mb-6 leading-relaxed">
                  {item.description}
                </p>
              )}

              <ProductPageActions
                item={{
                  id: item.id,
                  name: item.name,
                  image_url: item.image_url,
                  is_available: item.is_available,
                  variants: item.variants,
                }}
              />

              <div className="mt-6">
                <ProductNotice leadTimeDays={item.lead_time_days} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 規格區 */}
      {hasSpecs && (
        <section className="border-b border-moon-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 brand-section">
            <SectionHeading className="mb-8 sm:mb-12" title="商品規格" />
            <div className="max-w-2xl mx-auto space-y-5">
              {item.size_info && (
                <div>
                  <span className="text-xs text-moon-muted tracking-widest">尺寸/份量</span>
                  <p className="brand-body text-sm text-moon-text mt-1">{item.size_info}</p>
                </div>
              )}
              {item.included_items && (
                <div>
                  <span className="text-xs text-moon-muted tracking-widest">附贈</span>
                  <p className="brand-body text-sm text-moon-text mt-1">{item.included_items}</p>
                </div>
              )}
              {item.storage_info && (
                <div>
                  <span className="text-xs text-moon-muted tracking-widest">保存方式</span>
                  <p className="brand-body text-sm text-moon-text mt-1">{item.storage_info}</p>
                </div>
              )}
              {item.ingredients && item.ingredients.length > 0 && (
                <div>
                  <span className="text-xs text-moon-muted tracking-widest">成分</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.ingredients.map((ingredient) => (
                      <span
                        key={ingredient}
                        className="text-xs border border-moon-border/60 text-moon-muted px-2 py-1"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {item.allergens && item.allergens.length > 0 && (
                <div>
                  <span className="text-xs text-moon-muted tracking-widest">過敏原</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.allergens.map((allergen) => (
                      <span
                        key={allergen}
                        className="text-xs border border-moon-gold/60 text-moon-gold px-2 py-1"
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <Link
          href="/"
          className="text-xs text-moon-muted tracking-widest hover:text-moon-accent transition-colors"
        >
          ← 回全部商品
        </Link>
      </div>
    </div>
  );
}
