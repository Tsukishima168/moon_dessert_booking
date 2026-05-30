'use client';

import { useEffect, useState } from 'react';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';

interface DiscordStatus {
    isConfigured: boolean;
    status: 'connected' | 'not_configured';
    message: string;
}

export default function DiscordSettingsPage() {
    const [status, setStatus] = useState<DiscordStatus | null>(null);
    const [testMessage, setTestMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/admin/discord-settings');
            if (res.ok) setStatus(await res.json());
        } catch (error) {
            console.error('載入 Discord 狀態錯誤:', error);
        }
    };

    const handleTestNotification = async () => {
        setLoading(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/discord-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: testMessage || '🧪 月島甜點 - 測試訊息' }),
            });
            const data = await res.json();
            setTestResult({
                success: res.ok,
                message: data.message || (res.ok ? '✅ 測試訊息已發送到 Discord！' : '❌ 發送失敗'),
            });
        } catch (error) {
            console.error('測試發送錯誤:', error);
            setTestResult({ success: false, message: '❌ 發送出錯' });
        } finally {
            setLoading(false);
        }
    };

    const connected = status?.isConfigured ?? false;

    return (
        <div className="min-h-screen bg-moon-black p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-light text-moon-accent tracking-wider mb-2">
                        🎮 Discord 通知
                    </h1>
                    <p className="text-sm text-moon-muted">
                        訂單通知會發送到與 map / menu 共用的「#月島訂單通知」頻道，並標注來源為「線上商店」。
                    </p>
                </div>

                {/* 連線狀態（唯讀）*/}
                <div
                    className={`border p-6 mb-8 rounded ${
                        connected ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {connected ? (
                            <CheckCircle className="text-green-400 flex-shrink-0" size={22} />
                        ) : (
                            <AlertCircle className="text-red-400 flex-shrink-0" size={22} />
                        )}
                        <div>
                            <p className={`font-medium ${connected ? 'text-green-300' : 'text-red-300'}`}>
                                {connected ? 'Discord 已連線' : 'Discord 未設定'}
                            </p>
                            <p className="text-sm text-moon-muted">{status?.message ?? '讀取中…'}</p>
                        </div>
                    </div>
                </div>

                {/* 設定方式（透過環境變數，不再用頁面儲存）*/}
                <div className="border border-moon-accent/30 bg-moon-accent/5 p-6 mb-8 rounded">
                    <h2 className="text-sm text-moon-accent mb-3 tracking-wider">⚙️ 設定方式（透過環境變數）</h2>
                    <p className="text-sm text-moon-text mb-3">
                        本頁為唯讀狀態檢視。Discord 連線由環境變數設定 —— serverless 環境下頁面即時儲存無法持久化，因此改走 env：
                    </p>
                    <ul className="text-sm text-moon-text space-y-1 list-disc list-inside">
                        <li><code className="text-moon-accent">DISCORD_TOKEN</code> — 與 map / menu 共用的同一個 bot</li>
                        <li><code className="text-moon-accent">DISCORD_ORDER_CHANNEL_ID</code> — 目標頻道（預設 #月島訂單通知）</li>
                        <li>於 Vercel → Project Settings → Environment Variables 設定後重新部署</li>
                    </ul>
                </div>

                {/* 測試通知 */}
                <div className="border border-moon-border bg-moon-dark/70 p-6 mb-8">
                    <h2 className="text-lg text-moon-text font-light tracking-wider mb-6">🧪 測試通知</h2>

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
                            disabled={loading || !connected}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            <Send size={18} />
                            {loading ? '發送中...' : '發送測試訊息'}
                        </button>

                        {!connected && (
                            <p className="text-xs text-moon-muted">尚未設定 DISCORD_TOKEN，無法發送測試。</p>
                        )}

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

                {/* 已接上的通知 */}
                <div className="border border-moon-border bg-moon-dark/70 p-6">
                    <h2 className="text-lg text-moon-text font-light tracking-wider mb-6">📢 已接上的通知</h2>

                    <div className="space-y-3">
                        {[
                            { icon: '🛒', title: '新訂單通知', desc: '有客戶下單時即時通知店家' },
                            { icon: '✅', title: '訂單狀態更新', desc: '狀態變更時通知（待付款 → 已付款 → 可取貨…）' },
                        ].map((notif, idx) => (
                            <div key={idx} className="border border-moon-border/50 p-4 flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{notif.icon}</span>
                                        <span className="text-moon-text font-medium">{notif.title}</span>
                                        <span className="text-xs px-2 py-1 bg-green-400/10 text-green-400">✓ 已啟用</span>
                                    </div>
                                    <p className="text-xs text-moon-muted">{notif.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-moon-muted mt-4">
                        行銷活動 / 系統警告 / 營收提醒等通知尚未接上（屬幽靈系統，待決策）。
                    </p>
                </div>
            </div>
        </div>
    );
}
