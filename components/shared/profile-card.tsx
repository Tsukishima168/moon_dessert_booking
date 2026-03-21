import { Mail, Phone, User } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface ProfileCardProps {
  name: string
  email?: string | null
  phone?: string | null
  joinedAt?: string | null
  title?: string
  subtitle?: string
  className?: string
  tone?: 'dark' | 'light'
  footer?: ReactNode
}

const toneClasses = {
  dark: {
    card: 'bg-moon-black border-moon-border text-moon-text',
    avatar: 'bg-moon-accent text-moon-black',
    title: 'text-moon-accent',
    muted: 'text-moon-muted',
    meta: 'text-moon-muted',
  },
  light: {
    card: 'bg-white border-gray-200 text-gray-800 shadow-lg',
    avatar: 'bg-pink-100 text-pink-600',
    title: 'text-gray-800',
    muted: 'text-gray-600',
    meta: 'text-gray-500',
  },
} as const

export function ProfileCard({
  name,
  email,
  phone,
  joinedAt,
  title,
  subtitle,
  className,
  tone = 'dark',
  footer,
}: ProfileCardProps) {
  const styles = toneClasses[tone]

  return (
    <section className={cn('rounded-lg border p-6', styles.card, className)}>
      {title ? (
        <div className="mb-4">
          <h2 className={cn('text-xl font-semibold', styles.title)}>{title}</h2>
          {subtitle ? <p className={cn('mt-1 text-sm', styles.muted)}>{subtitle}</p> : null}
        </div>
      ) : null}

      <div className="flex items-start gap-4">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', styles.avatar)}>
          <User size={22} />
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <h3 className={cn('text-2xl font-semibold', styles.title)}>{name}</h3>
            {joinedAt ? <p className={cn('mt-1 text-xs', styles.meta)}>會員加入於 {joinedAt}</p> : null}
          </div>

          <div className="space-y-1.5 text-sm">
            {email ? (
              <p className={cn('flex items-center gap-2', styles.muted)}>
                <Mail size={14} />
                <span>{email}</span>
              </p>
            ) : null}
            {phone ? (
              <p className={cn('flex items-center gap-2', styles.muted)}>
                <Phone size={14} />
                <span>{phone}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {footer ? <div className={cn('mt-6 border-t pt-6', tone === 'dark' ? 'border-moon-border' : 'border-gray-200')}>{footer}</div> : null}
    </section>
  )
}
