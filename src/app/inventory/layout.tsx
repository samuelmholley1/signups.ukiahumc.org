import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'UUMC Food Pantry Inventory',
  description: 'Center for Hope Pantry Inventory - Ukiah United Methodist Church',
}

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
