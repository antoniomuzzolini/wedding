'use client'

import { useState } from 'react'
import { SelectedImage } from './types'
import { useGallery } from './hooks/useGallery'
import { useImageNavigation } from './hooks/useImageNavigation'
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation'
import ProfileCard from './components/ProfileCard'
import GallerySection from './components/GallerySection'
import ImageModal from './components/ImageModal'
import { PROFILE_DATA, STORY_TEXT } from './constants'

export default function Us() {
  const { gallerySections, loading } = useGallery()
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null)

  const { navigateImage } = useImageNavigation({
    selectedImage,
    gallerySections,
    setSelectedImage,
  })

  useKeyboardNavigation({
    selectedImage,
    onClose: () => setSelectedImage(null),
    onNavigate: navigateImage,
  })

  const handleImageClick = (src: string, sectionName: string, index: number) => {
    setSelectedImage({ src, sectionName, index })
  }

  const handleCloseModal = () => {
    setSelectedImage(null)
  }

  const hasGalleryContent = Object.keys(gallerySections).length > 0

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-serif text-wedding-sage-dark text-center mb-12">
          La Nostra Storia
        </h1>
        
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {PROFILE_DATA.map((profile) => (
            <ProfileCard
              key={profile.name}
              imageSrc={profile.imageSrc}
              imageAlt={profile.imageAlt}
              name={profile.name}
            />
          ))}
        </div>

        <div className="bg-white/60 p-8 rounded-lg shadow-lg">
          <h2 className="text-3xl font-serif text-wedding-sage-dark mb-6 text-center">
            Come Ci Siamo Incontrati
          </h2>
          <p className="text-gray-700 leading-relaxed text-lg text-center whitespace-pre-line">
            {STORY_TEXT}
          </p>
        </div>

        <div className="mt-16">
          <h2 className="text-4xl font-serif text-wedding-sage-dark mb-12 text-center">
            I Nostri Ricordi
          </h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-600">Caricamento galleria...</div>
          ) : !hasGalleryContent ? (
            <div className="text-center py-8 text-gray-600">Nessuna foto disponibile</div>
          ) : (
            <div className="space-y-16">
              {Object.entries(gallerySections).map(([sectionName, images]) => (
                <GallerySection
                  key={sectionName}
                  sectionName={sectionName}
                  images={images}
                  onImageClick={handleImageClick}
                />
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

      {selectedImage && (
        <ImageModal
          selectedImage={selectedImage}
          gallerySections={gallerySections}
          onClose={handleCloseModal}
          onNavigate={navigateImage}
        />
      )}
    </div>
  )
}
