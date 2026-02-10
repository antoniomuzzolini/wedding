import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contatti',
  description: 'Contatti per il matrimonio di Francesca Poles e Antonio Muzzolini. Informazioni sulla location Villa Caiselli a Pavia di Udine e come raggiungerci.',
  keywords: ['contatti matrimonio', 'Villa Caiselli', 'Pavia di Udine', 'come raggiungere', 'indirizzo matrimonio'],
  openGraph: {
    title: 'Contatti - The Puzzles Wedding',
    description: 'Contatti e informazioni sulla location del matrimonio',
    type: 'website',
  },
}

export default function ContactsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
