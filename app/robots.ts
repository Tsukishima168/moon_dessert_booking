import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://shop.kiwimu.com';

    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/about',
                    '/faq',
                    '/shipping',
                    '/refund',
                    '/location',
                    '/terms',
                    '/privacy',
                    '/product/',
                    '/llms.txt',
                ],
                disallow: [
                    '/api/',
                    '/admin/',
                    '/auth/',
                    '/account/',
                    '/checkout/',
                    '/order/',
                    '/*?*',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}
