import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmOptions {
  title?: string
  description: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

export function useConfirm() {
  const [promise, setPromise] = useState<{
    resolve: (value: boolean) => void
  } | null>(null)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)

  const confirm = (opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts)
      setPromise({ resolve })
    })
  }

  const handleConfirm = () => {
    promise?.resolve(true)
    setPromise(null)
    setOptions(null)
  }

  const handleCancel = () => {
    promise?.resolve(false)
    setPromise(null)
    setOptions(null)
  }

  const ConfirmDialog = () => (
    <AlertDialog open={promise !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title || 'Conferma'}</AlertDialogTitle>
          <AlertDialogDescription>
            {options?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {options?.cancelText || 'Annulla'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={options?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {options?.confirmText || 'Conferma'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { confirm, ConfirmDialog }
}