import Image from 'next/image'
import { SelectedImage, GallerySections } from '../types'
import { formatSectionName } from '../utils'
import ModalButton from './ModalButton'

interface ImageModalProps {
  selectedImage: SelectedImage
  gallerySections: GallerySections
  onClose: () => void
  onNavigate: (direction: 'prev' | 'next') => void
}

export default function ImageModal({
  selectedImage,
  gallerySections,
  onClose,
  onNavigate,
}: ImageModalProps) {
  const currentSection = gallerySections[selectedImage.sectionName] || []
  const totalImages = currentSection.length

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <ModalButton
        onClick={onClose}
        className="absolute top-20 right-4"
        ariaLabel="Chiudi"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </ModalButton>

      <ModalButton
        onClick={() => onNavigate('prev')}
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2"
        ariaLabel="Foto precedente"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </ModalButton>

      <ModalButton
        onClick={() => onNavigate('next')}
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2"
        ariaLabel="Foto successiva"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </ModalButton>

      <div
        className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={selectedImage.src}
          alt={`${formatSectionName(selectedImage.sectionName)} - Foto ${selectedImage.index + 1}`}
          width={1200}
          height={800}
          className="max-w-full max-h-full object-contain rounded-lg"
          unoptimized
          priority
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/70 px-3 py-1.5 rounded-lg text-sm z-[10000] shadow-lg">
        {selectedImage.index + 1} / {totalImages}
      </div>
    </div>
  )
}
