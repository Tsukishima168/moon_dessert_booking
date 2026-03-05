import { cookies } from 'next/headers';
import { createHash } from 'crypto';

export async function ensureAdmin(): Promise<boolean> {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return false;

    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token')?.value;
    if (!adminToken) return false;

    const expectedToken = createHash('sha256').update(adminPassword).digest('hex');
    return adminToken === expectedToken;
}

