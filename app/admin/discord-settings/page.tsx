'use client';

import { useEffect, useState } from 'react';
import { Save, Send, AlertCircle, CheckCircle, LogOut, Copy, RefreshCw } from 'lucide-react';

export default function DiscordSettingsPage() {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showUrl, setShowUrl] = useState(false);

    useEffect(() => {
        // 載入已保存的 URL（只顯示部分，隱藏敏感信息）
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/admin/discord-settings');
            if (response.ok) {
                const data = await response.json();
                // 只顯示 URL 前綴和後綴，隱藏中間部分
                if (data.webhookUrl) {
                    const parts = data.webhookUrl.split('/');
                    const masked = `https://discord.com/api/webhooks/[隱藏]/${parts[parts.length - 1]}`;
                    setWebhookUrl(masked);
                }
            }
        } catch (error) {
            console.error('載入設定錯誤:', error);
        }
    };

    const handleSaveUrl = async () => {
        if (!webhookUrl || webhookUrl.includes('[隱藏]')) {
            alert('請輸入完整的 Webhook URL');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/admin/discord-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ webhookUrl }),
            });

            if (response.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
                alert('✅ Discord Webhook URL 已儲存！');
            } else {
                alert('❌ 儲存失敗');
            }
        } catch (error) {
            console.error('儲存錯誤:', error);
            alert('❌ 儲存出錯');
        } finally {
            setLoading(false);
        }
    };

    const handleTestNotification = async () => {
        if (!webhookUrl || webhookUrl.includes('[隱藏]')) {
            alert('請先設定 Webhook URL');
            return;
        }

        setLoading(true);
        setTestResult(null);

        try {
            const response = await fetch('/api/admin/discord-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: testMessage || '🧪 月島甜點 - 測試訊息',
                }),
            });

            const data = await response.json();
            setTestResult({
                success: response.ok,
                message: data.message || (response.ok ? '✅ 測試訊息已發送到 Discord！' : '❌ 發送失敗'),
            });
        } catch (error) {
            setTestResult({
                success: false,
                message: '❌ 發送出錯',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-moon-black p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-light text-moon-accent tracking-wider mb-2">
                        🎮 Discord 通知設定
                    </h1>
                    <p className="text-sm text-moon-muted">
                        設定 Discord Webhook 接收訂單通知和行銷消息
                    </p>
                </div>

                {/* 說明 */}
                <div className="border border-moon-accent/30 bg-moon-accent/5 p-6 mb-8 rounded">
                    <h2 className="text-sm text-moon-accent mb-3 tracking-wider">📚 如何取得 Webhook URL?</h2>
                    <ol className="text-sm text-moon-text space-y-2 list-decimal list-inside">
                        <li>開啟 Discord → 進入您的伺服器</li>
                        <li>在想要接收通知的頻道按右鍵 → <strong>編輯頻道</strong></li>
                        <li>左側選 <strong>整合</strong> → <strong>Webhook</strong></li>
                        <li>點 <strong>新增 Webhook</strong></li>
                        <li>名稱填 "月島訂單 Bot" (可自訂)</li>
                        <li>點 <strong>複製 Webhook URL</strong></li>
                        <li>貼到下方並儲存</li>
                    </ol>
                </div>

                {/* Webhook URL 設定 */}
                <div className="border border-moon-border bg-moon-dark/70 p-6 mb-8">
                    <h2 className="text-lg text-moon-text font-light tracking-wider mb-6">
                        🔗 Webhook URL
                    </h2>

                    <div className="space-y-4">
                        {/* URL 輸入 */}
                        <div>
                            <label className="block text-xs text-moon-muted mb-2">Discord Webhook URL</label>
                            <div className="flex gap-2">
                                <input
                                    type={showUrl ? 'text' : 'password'}
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    placeholder="https://discord.com/api/webhooks/..."
                                    className="flex-1 bg-moon-black border border-moon-border px-4 py-2 text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                />
                                <button
                                    onClick={() => setShowUrl(!showUrl)}
                                    className="px-3 py-2 border border-moon-border text-moon-muted hover:text-moon-accent hover:border-moon-accent transition-colors text-xs"
                                    title={showUrl ? '隱藏' : '顯示'}
                                >
                                    {showUrl ? '隱藏' : '顯示'}
                                </button>
                            </div>
                            <p className="text-xs text-moon-muted mt-2">
                                URL 將被安全地加密儲存，不會在頁面上顯示完整內容
                            </p>
                        </div>

                        {/* 儲存按鈕 */}
                        <button
                            onClick={handleSaveUrl}
                            disabled={loading || !webhookUrl}
                            className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? '儲存中...' : '儲存 Webhook URL'}
                        </button>

                        {saved && (
                            <div className="flex items-center gap-2 text-green-400 text-sm">
                                <CheckCircle size={16} />
                                ✅ 已成功儲存
                            </div>
                        )}
                    </div>
                </div>

                {/* 測試通知 */}
                <div className="border border-moon-border bg-moon-dark/70 p-6 mb-8">
                    <h2 className="text-lg text-moon-text font-light tracking-wider mb-6">
                        🧪 測試通知
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-moon-muted mb-2">測試訊息內容（選填）</label>
                            <textarea
                                value={testMessage}
                                onChange={(e) => setTestMessage(e.target.value)}
                                placeholder="不填會使用預設訊息"
                                className="w-full bg-moon-black border border-moon-border px-4 py-2 text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                rows={3}
                            />
                        </div>

                        <button
                            onClick={handleTestNotification}
                            disabled={loading || !webhookUrl || webhookUrl.includes('[隱藏]')}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            <Send size={18} />
                            {loading ? '發送中...' : '發送測試訊息'}
                        </button>

                        {testResult && (
                            <div
                                className={`flex items-start gap-3 p-4 rounded ${
                                    testResult.success
                                        ? 'border border-green-500/30 bg-green-500/10 text-green-400'
                                        : 'border border-red-500/30 bg-red-500/10 text-red-400'
                                }`}
                            >
                                {testResult.success ? (
                                    <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                )}
                                <p className="text-sm">{testResult.message}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 通知功能 */}
                <div className="border border-moon-border bg-moon-dark/70 p-6">
                    <h2 className="text-lg text-moon-text font-light tracking-wider mb-6">
                        📢 啟用的通知功能
                    </h2>

                    <div className="space-y-3">
                        {[
                            {
                                icon: '🛒',
                                title: '新訂單通知',
                                desc: '有客戶下單時立即通知',
                                enabled: true,
                            },
                            {
                                icon: '✅',
                                title: '訂單狀態更新',
                                desc: '訂單狀態變更時通知 (待付款 → 已付款 → 製作中...)',
                                enabled: true,
                            },
                            {
                                icon: '📧',
                                title: '行銷活動通知',
                                desc: '行銷活動發送時通知',
                                enabled: true,
                            },
                            {
                                icon: '⚠️',
                                title: '系統警告',
                                desc: '系統錯誤或重要事件通知',
                                enabled: true,
                            },
                            {
                                icon: '💰',
                                title: '營收提醒',
                                desc: '每日營收統計',
                                enabled: false,
                            },
                        ].map((notif, idx) => (
                            <div key={idx} className="border border-moon-border/50 p-4 flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{notif.icon}</span>
                                        <span className="text-moon-text font-medium">{notif.title}</span>
                                        <span
                                            className={`text-xs px-2 py-1 ${
                                                notif.enabled
                                                    ? 'bg-green-400/10 text-green-400'
                                                    : 'bg-gray-400/10 text-gray-400'
                                            }`}
                                        >
                                            {notif.enabled ? '✓ 已啟用' : '○ 未啟用'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-moon-muted">{notif.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 注意事項 */}
                <div className="mt-8 border border-yellow-500/30 bg-yellow-500/10 p-6 rounded">
                    <div className="flex gap-3">
                        <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
                        <div className="text-sm text-yellow-300">
                            <p className="font-medium mb-1">⚠️ 重要提醒</p>
                            <ul className="space-y-1 list-disc list-inside">
                                <li>Webhook URL 會被安全加密儲存</li>
                                <li>請勿在他人面前透露您的 Webhook URL</li>
                                <li>如果 URL 洩露，請在 Discord 重新建立 Webhook</li>
                                <li>確保 Vercel 環境變數也已更新</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
