import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lista Nozze',
  description: 'Lista nozze di Francesca Poles e Antonio Muzzolini. Contribuisci al loro viaggio di nozze in Giappone. Informazioni IBAN e intestatario.',
  keywords: ['lista nozze', 'regalo matrimonio', 'viaggio di nozze', 'Giappone', 'IBAN'],
  openGraph: {
    title: 'Lista Nozze - The Puzzles Wedding',
    description: 'Contribuisci al viaggio di nozze in Giappone di Francesca e Antonio',
    type: 'website',
  },
  robots: {
    index: false, // Lista nozze spesso non indicizzata per privacy
    follow: true,
  },
}

export default function GiftListLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
