import Image from 'next/image'
import { formatSectionName } from '../utils'

interface GallerySectionProps {
  sectionName: string
  images: string[]
  onImageClick: (src: string, sectionName: string, index: number) => void
}

export default function GallerySection({ sectionName, images, onImageClick }: GallerySectionProps) {
  return (
    <div className="mb-12">
      <h3 className="text-3xl font-serif text-wedding-sage-dark mb-6 text-center capitalize">
        {formatSectionName(sectionName)}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((src, index) => (
          <div
            key={index}
            onClick={() => onImageClick(src, sectionName, index)}
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
  )
}
