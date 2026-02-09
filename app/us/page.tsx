'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

interface GallerySections {
  [sectionName: string]: string[]
}

export default function Us() {
  const [gallerySections, setGallerySections] = useState<GallerySections>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const response = await fetch('/api/gallery')
        const data = await response.json()
        if (response.ok) {
          setGallerySections(data.sections)
        }
      } catch (error) {
        console.error('Error loading gallery:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGallery()
  }, [])

  const formatSectionName = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-serif text-wedding-gold text-center mb-12">
          La Nostra Storia
        </h1>
        
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="bg-white/60 p-8 rounded-lg shadow-lg">
            {/* Add profile photo - Replace 'spouse1.jpg' with your actual image filename */}
            <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden shadow-lg">
              <Image
                src="/images/francy.jpg"
                alt="Francesca Poles"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <h2 className="text-3xl font-serif text-wedding-gold mb-4 text-center">Francesca Poles</h2>
            <p className="text-gray-700 leading-relaxed">
              [Aggiungi la tua storia personale, background, interessi, ecc.]
            </p>
          </div>
          
          <div className="bg-white/60 p-8 rounded-lg shadow-lg">
            {/* Add profile photo - Replace 'spouse2.jpg' with your actual image filename */}
            <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden shadow-lg">
              <Image
                src="/images/ando.jpg"
                alt="Antonio Muzzolini"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <h2 className="text-3xl font-serif text-wedding-gold mb-4 text-center">Antonio Muzzolini</h2>
            <p className="text-gray-700 leading-relaxed">
              [Aggiungi la tua storia personale, background, interessi, ecc.]
            </p>
          </div>
        </div>

        <div className="bg-white/60 p-8 rounded-lg shadow-lg">
          <h2 className="text-3xl font-serif text-wedding-gold mb-6 text-center">
            Come Ci Siamo Incontrati
          </h2>
          <p className="text-gray-700 leading-relaxed text-lg text-center">
            [Condividi la vostra storia d'amore - come vi siete conosciuti, il vostro primo appuntamento, la proposta, ecc.]
          </p>
        </div>

        {/* Photo Gallery/Album Section */}
        <div className="mt-16">
          <h2 className="text-4xl font-serif text-wedding-gold mb-12 text-center">
            I Nostri Ricordi
          </h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-600">Caricamento galleria...</div>
          ) : Object.keys(gallerySections).length === 0 ? (
            <div className="text-center py-8 text-gray-600">Nessuna foto disponibile</div>
          ) : (
            <div className="space-y-16">
              {Object.entries(gallerySections).map(([sectionName, images]) => (
                <div key={sectionName} className="mb-12">
                  <h3 className="text-3xl font-serif text-wedding-gold mb-6 text-center capitalize">
                    {formatSectionName(sectionName)}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((src, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform cursor-pointer group"
                      >
                        <Image
                          src={src}
                          alt={`${formatSectionName(sectionName)} - Foto ${index + 1}`}
                          fill
                          className="object-cover group-hover:brightness-110 transition-all"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-16 text-center">
          <p className="text-2xl font-serif text-gray-800">
            Non vediamo l'ora di festeggiare con voi!
          </p>
        </div>
      </div>
    </div>
  )
}
