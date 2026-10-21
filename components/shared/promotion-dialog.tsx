'use client'
import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
export function PromotionDialog({ title, description, children, onClose, busy = false }: {
  title: string; description: string; children: ReactNode; onClose: () => void; busy?: boolean
}) {
  return <Dialog.Root open onOpenChange={open => { if (!open && !busy) onClose() }}>
    <Dialog.Portal><Dialog.Backdrop className="fixed inset-0 z-70 bg-black/50" />
      <Dialog.Popup className="promotion-dialog fixed left-1/2 top-1/2 z-71 w-[calc(100%-24px)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-5 sm:p-7" finalFocus>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-relaxed">{description}</Dialog.Description></div>
          <Dialog.Close disabled={busy} className="promotion-close shrink-0" aria-label={`關閉${title}`}><X size={20} /></Dialog.Close>
        </div>
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}
