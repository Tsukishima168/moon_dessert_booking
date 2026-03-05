import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';

/**
 * POST /api/admin/upload
 * 上傳圖片至 Cloudinary
 * Body: FormData { file: File, folder?: string }
 * Returns: { url: string, public_id: string }
 */
export async function POST(request: NextRequest) {
  const isAdmin = await ensureAdmin();
  if (!isAdmin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { success: false, message: 'Cloudinary 設定缺失，請確認 CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'moon-dessert/menu';

    if (!file) {
      return NextResponse.json({ success: false, message: '請提供圖片檔案' }, { status: 400 });
    }

    // 限制：只允許圖片類型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, message: '只允許上傳圖片' }, { status: 400 });
    }

    // 限制：最大 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: '圖片大小不能超過 5MB' }, { status: 400 });
    }

    // 產生 Cloudinary 簽名
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

    // 使用 Web Crypto API 計算 SHA-1 簽名
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign + apiSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // 上傳至 Cloudinary
    const uploadForm = new FormData();
    uploadForm.append('file', file);
    uploadForm.append('api_key', apiKey);
    uploadForm.append('timestamp', String(timestamp));
    uploadForm.append('signature', signature);
    uploadForm.append('folder', folder);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: uploadForm }
    );

    if (!uploadRes.ok) {
      const errData = await uploadRes.json();
      throw new Error(errData.error?.message || '上傳失敗');
    }

    const result = await uploadRes.json();

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error('Cloudinary 上傳錯誤:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '上傳失敗' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/upload
 * 刪除 Cloudinary 圖片
 * Body: { public_id: string }
 */
export async function DELETE(request: NextRequest) {
  const isAdmin = await ensureAdmin();
  if (!isAdmin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ success: false, message: 'Cloudinary 設定缺失' }, { status: 500 });
  }

  try {
    const { public_id } = await request.json();
    if (!public_id) {
      return NextResponse.json({ success: false, message: '請提供 public_id' }, { status: 400 });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = `public_id=${public_id}&timestamp=${timestamp}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign + apiSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const deleteForm = new FormData();
    deleteForm.append('public_id', public_id);
    deleteForm.append('api_key', apiKey);
    deleteForm.append('timestamp', String(timestamp));
    deleteForm.append('signature', signature);

    const deleteRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      { method: 'POST', body: deleteForm }
    );

    const result = await deleteRes.json();
    if (result.result !== 'ok') {
      throw new Error('刪除失敗');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cloudinary 刪除錯誤:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '刪除失敗' },
      { status: 500 }
    );
  }
}
