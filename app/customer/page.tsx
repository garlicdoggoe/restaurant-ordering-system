import CustomerPageClient from "./customer-page-client"

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function CustomerPage() {
  return <CustomerPageClient />
}