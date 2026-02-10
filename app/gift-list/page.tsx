'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function GiftList() {
  const iban = 'IT60 X054 2811 1010 0000 0123 4567'
  const ibanClean = iban.replace(/\s/g, '') // Rimuove spazi per la copia
  const accountHolder = 'Muzzolini Antonio, Poles Francesca'
  const [ibanCopied, setIbanCopied] = useState(false)
  const [holderCopied, setHolderCopied] = useState(false)

  const handleCopyIban = async () => {
    try {
      await navigator.clipboard.writeText(ibanClean)
      setIbanCopied(true)
      setTimeout(() => setIbanCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyHolder = async () => {
    try {
      await navigator.clipboard.writeText(accountHolder)
      setHolderCopied(true)
      setTimeout(() => setHolderCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-serif text-wedding-gold text-center mb-12">
          Lista Nozze
        </h1>

        <div className="bg-white/80 p-8 rounded-lg shadow-lg mb-12">
          {/* Foto della coppia */}
          <div className="relative w-full max-w-md mx-auto mb-8 aspect-[4/3] rounded-lg overflow-hidden shadow-xl">
            <Image
              src="/images/gift-list.jpg"
              alt="Francesca e Antonio"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Testo */}
          <p className="text-lg md:text-xl text-gray-700 leading-relaxed text-center mb-12">
            Non ne abbiamo una! Il regalo più grande è la vostra presenza, ma se volete contribuire al nostro viaggio di nozze in Giappone ci farebbe sicuramente piacere
          </p>

          {/* Intestatario e IBAN centrati */}
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Intestatario */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleCopyHolder}
                className="text-lg md:text-xl font-serif text-wedding-gold text-center cursor-pointer hover:opacity-80 transition-opacity select-none touch-manipulation"
                aria-label="Clicca per copiare l'intestatario"
              >
                {accountHolder}
              </button>
              {holderCopied && (
                <p className="text-sm text-wedding-gold mt-2 animate-fade-in">
                  Intestatario copiato!
                </p>
              )}
            </div>

            {/* IBAN */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleCopyIban}
                className="text-xl md:text-2xl font-serif text-wedding-gold text-center break-all cursor-pointer hover:opacity-80 transition-opacity select-none touch-manipulation"
                aria-label="Clicca per copiare l'IBAN"
              >
                {iban}
              </button>
              {ibanCopied && (
                <p className="text-sm text-wedding-gold mt-2 animate-fade-in">
                  IBAN copiato!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
