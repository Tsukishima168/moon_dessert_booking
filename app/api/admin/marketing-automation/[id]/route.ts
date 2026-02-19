import { createAuthClient } from '@/lib/supabase/server-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createAuthClient();
        
        const { data: { session } } = await supabase.auth.getSession();
        const role = (session?.user?.app_metadata?.role || '').toString().toLowerCase();
        
        if (!session || role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        return NextResponse.json({ success: true, data: { id: params.id, ...body } });
    } catch (error) {
        console.error('PATCH /api/admin/marketing-automation/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to update rule' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createAuthClient();
        
        const { data: { session } } = await supabase.auth.getSession();
        const role = (session?.user?.app_metadata?.role || '').toString().toLowerCase();
        
        if (!session || role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/admin/marketing-automation/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to delete rule' },
            { status: 500 }
        );
    }
}
