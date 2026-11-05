import type { Metadata } from 'next';

// 付款結果頁（/order/success、cancel、error）SEO - 設定 noindex（robots.txt 已 Disallow /order/；內容檢核 O10）
export const metadata: Metadata = {
    title: '訂單狀態',
    robots: {
        index: false,
        follow: false,
    },
};

export default function OrderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
