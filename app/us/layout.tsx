import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'La Nostra Storia',
  description: 'Scopri la storia d\'amore di Francesca Poles e Antonio Muzzolini. La loro storia, come si sono conosciuti e la galleria dei loro ricordi insieme.',
  keywords: ['storia d\'amore', 'Francesca Poles', 'Antonio Muzzolini', 'galleria foto', 'ricordi'],
  openGraph: {
    title: 'La Nostra Storia - The Puzzles Wedding',
    description: 'Scopri la storia d\'amore di Francesca e Antonio',
    type: 'website',
  },
}

export default function UsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
