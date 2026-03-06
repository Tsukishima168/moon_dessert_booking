'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DebugPage() {
  const [apiTest, setApiTest] = useState<any>(null);
  const [authTest, setAuthTest] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    testAPI();
    checkAuth();
  }, []);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/menu');
      const data = await response.json();
      
      setApiTest({
        status: response.status,
        ok: response.ok,
        data: data,
        timestamp: new Date().toLocaleString()
      });
    } catch (error: any) {
      setApiTest({
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    }
    setLoading(false);
  };

  const checkAuth = () => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('admin_token='))
      ?.split('=')[1];
    
    setAuthTest(token ? `Found: ${token.substring(0, 20)}...` : 'Not found');
  };

  return (
    <div className="min-h-screen bg-moon-dark p-8">
      <Link href="/admin" className="text-moon-accent hover:underline mb-6 inline-block">
        ← 返回後台
      </Link>
      
      <h1 className="text-3xl font-bold text-moon-text mb-8">🔧 除錯工具</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 認證檢查 */}
        <div className="bg-moon-black border border-moon-border p-6">
          <h2 className="text-xl font-bold text-moon-accent mb-4">🔐 認證狀態</h2>
          <p className="text-moon-muted">admin_token cookie:</p>
          <p className="text-moon-text font-mono bg-black/50 p-3 rounded mt-2 break-all">
            {authTest || '檢查中...'}
          </p>
          <button
            onClick={checkAuth}
            className="mt-4 px-4 py-2 bg-moon-accent text-moon-black font-semibold hover:bg-moon-accent/80 transition"
          >
            重新檢查
          </button>
        </div>

        {/* API 測試 */}
        <div className="bg-moon-black border border-moon-border p-6">
          <h2 className="text-xl font-bold text-moon-accent mb-4">📡 API 測試</h2>
          <p className="text-moon-muted mb-2">GET /api/admin/menu</p>
          
          {loading ? (
            <p className="text-moon-text">測試中...</p>
          ) : apiTest ? (
            <>
              <p className={`text-sm font-semibold ${apiTest.ok ? 'text-green-400' : 'text-red-400'}`}>
                狀態: {apiTest.status || '錯誤'} - {apiTest.ok ? '✅ 成功' : '❌ 失敗'}
              </p>
              <pre className="text-moon-text font-mono bg-black/50 p-3 rounded mt-2 overflow-auto max-h-64 text-xs">
                {JSON.stringify(apiTest.data || { error: apiTest.error }, null, 2)}
              </pre>
              <p className="text-xs text-moon-muted mt-2">{apiTest.timestamp}</p>
            </>
          ) : (
            <p className="text-moon-text">未測試</p>
          )}
          
          <button
            onClick={testAPI}
            disabled={loading}
            className="mt-4 px-4 py-2 bg-moon-accent text-moon-black font-semibold hover:bg-moon-accent/80 transition disabled:opacity-50"
          >
            {loading ? '測試中...' : '執行測試'}
          </button>
        </div>

        {/* 環境變數檢查 */}
        <div className="bg-moon-black border border-moon-border p-6 md:col-span-2">
          <h2 className="text-xl font-bold text-moon-accent mb-4">⚙️ 環境變數</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-moon-muted">NEXT_PUBLIC_SUPABASE_URL:</span>
              <span className="text-green-400 ml-2">
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}
              </span>
            </p>
            <p>
              <span className="text-moon-muted">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
              <span className="text-green-400 ml-2">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}
              </span>
            </p>
            <p>
              <span className="text-moon-muted">ADMIN_PASSWORD (server):</span>
              <span className="text-yellow-400 ml-2">
                server-only (need to check manually)
              </span>
            </p>
          </div>
        </div>

        {/* 故障排除指南 */}
        <div className="bg-moon-black border border-moon-border p-6 md:col-span-2">
          <h2 className="text-xl font-bold text-moon-accent mb-4">📋 故障排除步驟</h2>
          <ol className="space-y-2 text-moon-text text-sm">
            <li><strong>1.</strong> 檢查認證狀態是否有 admin_token</li>
            <li><strong>2.</strong> 確認環境變數已加載 (✅)</li>
            <li><strong>3.</strong> 執行 API 測試看是否返回数据</li>
            <li><strong>4.</strong> 如果返回空數組，檢查 Supabase 表是否有數據</li>
            <li><strong>5.</strong> 檢查 Supabase RLS 策略是否允許訪問</li>
            <li><strong>6.</strong> 查看瀏覽器控制台和服務器日誌</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
