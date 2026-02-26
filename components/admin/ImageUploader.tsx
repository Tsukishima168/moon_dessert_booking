'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  currentImageUrl?: string;
  onUpload: (url: string) => void;
  folder?: string;
  label?: string;
}

export default function ImageUploader({
  currentImageUrl,
  onUpload,
  folder = 'moon-dessert/menu',
  label = '上傳圖片',
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string>(currentImageUrl || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 本地預覽
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError('');
    setUploading(true);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', folder);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.message);

      setPreview(data.url);
      onUpload(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗');
      setPreview(currentImageUrl || '');
    } finally {
      setUploading(false);
      // 清空 input 讓同一張圖可重複選
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleClear = () => {
    setPreview('');
    onUpload('');
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-moon-muted tracking-wider">{label}</label>

      {/* 預覽區 */}
      <div
        className="relative w-full aspect-video bg-moon-gray border border-moon-border/30 overflow-hidden cursor-pointer group"
        onClick={() => !uploading && fileRef.current?.click()}
      >
        {preview ? (
          <>
            <Image
              src={preview}
              alt="預覽"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-xs tracking-wider">點擊更換圖片</p>
            </div>
            {/* 清除按鈕 */}
            {!uploading && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1 transition-colors z-10"
              >
                <X size={14} />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-moon-muted/50">
            <ImageIcon size={32} />
            <p className="text-xs">點擊上傳圖片（最大 5MB）</p>
          </div>
        )}

        {/* 上傳中 overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-moon-black/70 flex items-center justify-center">
            <Loader2 className="animate-spin text-moon-accent" size={28} />
          </div>
        )}
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* 上傳結果 URL */}
      {preview && !uploading && (
        <p className="text-[10px] text-moon-muted/40 truncate font-mono">{preview}</p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {/* 手動按鈕 */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-xs text-moon-muted border border-moon-border/30 px-3 py-2 hover:border-moon-muted/60 transition-colors disabled:opacity-40"
      >
        {uploading ? (
          <><Loader2 size={12} className="animate-spin" /> 上傳中...</>
        ) : (
          <><Upload size={12} /> 選擇圖片</>
        )}
      </button>
    </div>
  );
}
