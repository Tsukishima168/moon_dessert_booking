import type { Metadata } from 'next';

// 會員中心（含 /account/order/*）SEO - 設定 noindex（robots.txt 已 Disallow /account/；內容檢核 O10）
export const metadata: Metadata = {
    title: '會員中心',
    robots: {
        index: false,
        follow: false,
    },
};

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
