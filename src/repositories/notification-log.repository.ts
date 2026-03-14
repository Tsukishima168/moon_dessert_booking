import { createAdminClient } from '@/lib/supabase-admin'

export interface NotificationLog {
  id: string
  order_id: string
  event_type: string
  trigger_mode: 'status_change' | 'manual_retry'
  requested_channel: 'all' | 'email' | 'discord' | 'n8n'
  previous_status: string | null
  current_status: string
  email_state: string
  email_message: string
  discord_state: string
  discord_message: string
  n8n_state: string
  n8n_message: string
  created_at: string
}

export interface InsertNotificationLogPayload {
  order_id: string
  event_type: string
  trigger_mode: 'status_change' | 'manual_retry'
  requested_channel: 'all' | 'email' | 'discord' | 'n8n'
  previous_status?: string | null
  current_status: string
  email_state: string
  email_message: string
  discord_state: string
  discord_message: string
  n8n_state: string
  n8n_message: string
}

export async function insertNotificationLog(
  payload: InsertNotificationLogPayload
): Promise<NotificationLog> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('notification_logs')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data as NotificationLog
}

export async function findNotificationLogsByOrderId(
  orderId: string,
  limit: number = 10
): Promise<NotificationLog[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('notification_logs')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as NotificationLog[]
}
