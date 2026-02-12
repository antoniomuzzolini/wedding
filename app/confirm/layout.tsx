import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conferma Presenza',
  description: 'Conferma la presenza al matrimonio di Francesca Poles e Antonio Muzzolini il 13 Settembre 2026 a Villa Caiselli, Pavia di Udine. Gestisci le preferenze alimentari e conferma la partecipazione.',
  keywords: ['conferma presenza', 'RSVP matrimonio', 'invito matrimonio', 'Francesca Poles', 'Antonio Muzzolini'],
  openGraph: {
    title: 'Conferma Presenza - The Puzzles Wedding',
    description: 'Conferma la presenza al matrimonio di Francesca e Antonio',
    type: 'website',
  },
}

export default function ConfirmLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
