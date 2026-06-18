'use client'

import { PluggyConnect } from 'react-pluggy-connect'

interface Props {
  accessToken: string
  onSuccess: (itemId: string, item: any) => void
  onError?: (err: any) => void
  onClose?: () => void
  updateItemId?: string
}

export function PluggyConnectWidget({ accessToken, onSuccess, onError, onClose, updateItemId }: Props) {
  return (
    <PluggyConnect
      connectToken={accessToken}
      includeSandbox={process.env.NODE_ENV !== 'production'}
      {...(updateItemId ? { updateItem: updateItemId } : {})}
      onSuccess={(itemData: any) => onSuccess(itemData.item?.id ?? itemData.itemId, itemData.item)}
      onError={(err: any) => onError?.(err)}
      onClose={() => onClose?.()}
    />
  )
}
