import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://shop.kiwimu.com';
    const lastModified = new Date('2026-05-06');

    return [
        {
            url: baseUrl,
            lastModified,
            changeFrequency: 'weekly' as const,
            priority: 1.0,
        },
        {
            url: `${baseUrl}/about`,
            lastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        },
    ];
}
