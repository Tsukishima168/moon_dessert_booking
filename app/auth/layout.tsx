import type { Metadata } from 'next';

// 登入頁 SEO - 設定 noindex（robots.txt 已 Disallow /auth/，這裡再加一層保險；內容檢核 O10）
export const metadata: Metadata = {
    title: '會員登入',
    robots: {
        index: false,
        follow: false,
    },
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
