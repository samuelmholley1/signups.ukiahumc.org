'use client'

import { useEffect } from 'react'

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    console.log('[InventoryLayout] Layout mounted for /inventory route')
  }, [])
  
  return <>{children}</>;
}
