import type { Metadata } from 'next';

// 結帳頁 SEO - 設定 noindex 避免被搜尋引擎索引
export const metadata: Metadata = {
    title: '結帳 | 月島甜點',
    robots: {
        index: false,
        follow: false,
    },
};

export default function CheckoutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
