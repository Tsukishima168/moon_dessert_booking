import { Calendar, Clock3, DollarSign, Package } from 'lucide-react'
import type { ReactNode } from 'react'

import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'

interface OrderSummaryCardProps {
  orderId: string
  status: string
  totalPrice: number
  createdAtLabel?: string
  pickupTimeLabel?: string
  deliveryMethodLabel?: string
  customerLabel?: string
  title?: string
  className?: string
  tone?: 'dark' | 'light'
  footer?: ReactNode
}

const toneClasses = {
  dark: {
    card: 'bg-moon-black border-moon-border text-moon-text',
    title: 'text-moon-accent',
    body: 'text-moon-text',
    muted: 'text-moon-muted',
    line: 'border-moon-border',
    amount: 'text-moon-accent',
    stat: 'bg-moon-dark/60',
  },
  light: {
    card: 'bg-white border-gray-200 text-gray-800 shadow-lg',
    title: 'text-gray-800',
    body: 'text-gray-800',
    muted: 'text-gray-600',
    line: 'border-gray-200',
    amount: 'text-pink-600',
    stat: 'bg-gray-50',
  },
} as const

export function OrderSummaryCard({
  orderId,
  status,
  totalPrice,
  createdAtLabel,
  pickupTimeLabel,
  deliveryMethodLabel,
  customerLabel,
  title = '訂單摘要',
  className,
  tone = 'dark',
  footer,
}: OrderSummaryCardProps) {
  const styles = toneClasses[tone]

  return (
    <section className={cn('rounded-lg border p-6', styles.card, className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={cn('text-2xl font-semibold', styles.title)}>{title}</h2>
          <p className={cn('mt-2 text-sm', styles.muted)}>
            訂單編號: <span className={cn('font-mono font-semibold', styles.amount)}>{orderId}</span>
          </p>
          {customerLabel ? <p className={cn('mt-2 text-sm', styles.muted)}>{customerLabel}</p> : null}
        </div>
        <StatusBadge status={status} showIcon className="px-4 py-2 text-sm" />
      </div>

      <div className={cn('mt-6 grid gap-4 border-t pt-4 md:grid-cols-2 xl:grid-cols-4', styles.line)}>
        {createdAtLabel ? (
          <div className={cn('rounded-lg p-4', styles.stat)}>
            <p className={cn('mb-1 flex items-center gap-2 text-sm', styles.muted)}>
              <Calendar size={14} />
              下單時間
            </p>
            <p className={cn('font-semibold', styles.body)}>{createdAtLabel}</p>
          </div>
        ) : null}

        {pickupTimeLabel ? (
          <div className={cn('rounded-lg p-4', styles.stat)}>
            <p className={cn('mb-1 flex items-center gap-2 text-sm', styles.muted)}>
              <Clock3 size={14} />
              取貨時間
            </p>
            <p className={cn('font-semibold', styles.body)}>{pickupTimeLabel}</p>
          </div>
        ) : null}

        {deliveryMethodLabel ? (
          <div className={cn('rounded-lg p-4', styles.stat)}>
            <p className={cn('mb-1 flex items-center gap-2 text-sm', styles.muted)}>
              <Package size={14} />
              取貨方式
            </p>
            <p className={cn('font-semibold', styles.body)}>{deliveryMethodLabel}</p>
          </div>
        ) : null}

        <div className={cn('rounded-lg p-4', styles.stat)}>
          <p className={cn('mb-1 flex items-center gap-2 text-sm', styles.muted)}>
            <DollarSign size={14} />
            總金額
          </p>
          <p className={cn('text-lg font-bold', styles.amount)}>NT${totalPrice.toFixed(0)}</p>
        </div>
      </div>

      {footer ? <div className={cn('mt-6 border-t pt-4', styles.line)}>{footer}</div> : null}
    </section>
  )
}
