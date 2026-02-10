import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conferma la Tua Presenza',
  description: 'Conferma la tua presenza al matrimonio di Francesca Poles e Antonio Muzzolini il 13 Settembre 2026 a Villa Caiselli, Pavia di Udine. Gestisci le tue preferenze alimentari e conferma la partecipazione.',
  keywords: ['conferma presenza', 'RSVP matrimonio', 'invito matrimonio', 'Francesca Poles', 'Antonio Muzzolini'],
  openGraph: {
    title: 'Conferma la Tua Presenza - The Puzzles Wedding',
    description: 'Conferma la tua presenza al matrimonio di Francesca e Antonio',
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
