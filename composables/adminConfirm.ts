import { reactive } from 'vue'

export type AdminConfirmOptions = {
  title: string
  content?: string
  okText?: string
  cancelText?: string
  danger?: boolean
}

type State = AdminConfirmOptions & {
  visible: boolean
  resolve: ((value: boolean) => void) | null
}

export const adminConfirmState = reactive<State>({
  visible: false,
  title: '',
  content: '',
  okText: 'OK',
  cancelText: 'Cancel',
  danger: false,
  resolve: null
})

/** Promise resolves true if user confirms, false if cancelled. */
export function adminConfirm(options: AdminConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    adminConfirmState.title = options.title
    adminConfirmState.content = options.content ?? ''
    adminConfirmState.okText = options.okText ?? 'OK'
    adminConfirmState.cancelText = options.cancelText ?? 'Cancel'
    adminConfirmState.danger = options.danger ?? false
    adminConfirmState.resolve = resolve
    adminConfirmState.visible = true
  })
}

export function adminConfirmOk() {
  const r = adminConfirmState.resolve
  adminConfirmState.visible = false
  adminConfirmState.resolve = null
  r?.(true)
}

export function adminConfirmCancel() {
  const r = adminConfirmState.resolve
  adminConfirmState.visible = false
  adminConfirmState.resolve = null
  r?.(false)
}
