import { MetadataRoute } from 'next';
import { getMenuItems } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://shop.kiwimu.com';
    const coreLastModified = new Date('2026-05-06');
    const contentLastModified = new Date('2026-07-10');

    const staticEntries: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: coreLastModified,
            changeFrequency: 'weekly' as const,
            priority: 1.0,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: coreLastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/faq`,
            lastModified: contentLastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        },
        {
            url: `${baseUrl}/shipping`,
            lastModified: contentLastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        },
        {
            url: `${baseUrl}/refund`,
            lastModified: contentLastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        },
        {
            url: `${baseUrl}/location`,
            lastModified: contentLastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: contentLastModified,
            changeFrequency: 'yearly' as const,
            priority: 0.3,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: contentLastModified,
            changeFrequency: 'yearly' as const,
            priority: 0.3,
        },
    ];

    // 動態收錄可售商品詳情頁（P0-1）：slug 優先，缺 slug 用 id。
    // 讀取失敗（例如本機無 DB 連線）時只回靜態頁，不讓整份 sitemap 掛掉。
    let productEntries: MetadataRoute.Sitemap = [];
    try {
        const menuItems = await getMenuItems();
        productEntries = menuItems
            .filter((item) => item.is_available && item.variants.length > 0)
            .map((item) => ({
                url: `${baseUrl}/product/${item.slug || item.id}`,
                lastModified: contentLastModified,
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }));
    } catch (error) {
        console.error('sitemap: 讀取商品資料錯誤:', error);
    }

    return [...staticEntries, ...productEntries];
}
