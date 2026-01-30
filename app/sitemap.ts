import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://dessert-booking.vercel.app'; // 請替換為您的實際網址

    // 基礎頁面
    const routes = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1.0,
        },
        // 未來可以從 Supabase 動態載入商品頁面
        // 例如: await getProductPages()
    ];

    return routes;
}
