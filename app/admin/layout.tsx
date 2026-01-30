import type { Metadata } from 'next';

// 後台 SEO - 完全不被搜尋引擎索引
export const metadata: Metadata = {
    title: '管理後台 | 月島甜點',
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
