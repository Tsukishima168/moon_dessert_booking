import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

async function syncServerSession(session: Session): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    })

    return response.ok
  } catch (error) {
    console.error('同步 session 到 server cookie 失敗:', error)
    return false
  }
}

async function wait(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

export async function ensureServerSession(
  retries = 6,
  delayMs = 250
): Promise<User | null> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      await syncServerSession(session)
      return session.user
    }

    if (attempt < retries) {
      await wait(delayMs)
    }
  }

  return null
}

export async function getResolvedSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.user) {
    await syncServerSession(session)
    return session
  }

  const fallbackSession = await new Promise<Session | null>(resolve => {
    const timeout = window.setTimeout(() => {
      subscription?.unsubscribe()
      resolve(null)
    }, 1500)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!nextSession?.user) {
        return
      }

      window.clearTimeout(timeout)
      subscription.unsubscribe()
      await syncServerSession(nextSession)
      resolve(nextSession)
    })
  })

  return fallbackSession
}

export async function clearServerSession(): Promise<void> {
  try {
    await fetch('/api/auth/set-session', {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('清除 server cookie 失敗:', error)
  }
}

export async function getResolvedUser(): Promise<User | null> {
  const session = await getResolvedSession()
  if (!session?.user) {
    return null
  }
  return session.user
}
