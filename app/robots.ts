import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://dessert-booking.vercel.app'; // 請替換為您的實際網址

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',           // API 路由不索引
                    '/admin/',         // 後台不索引
                    '/checkout/',      // 結帳頁不索引(避免重複內容)
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
