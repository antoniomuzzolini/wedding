import { useCallback } from 'react'
import { SelectedImage, GallerySections } from '../types'

interface UseImageNavigationProps {
  selectedImage: SelectedImage | null
  gallerySections: GallerySections
  setSelectedImage: (image: SelectedImage | null) => void
}

export function useImageNavigation({
  selectedImage,
  gallerySections,
  setSelectedImage,
}: UseImageNavigationProps) {
  const navigateImage = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedImage) return

      const currentSection = gallerySections[selectedImage.sectionName]
      if (!currentSection || currentSection.length === 0) return

      let newIndex = direction === 'next' 
        ? selectedImage.index + 1 
        : selectedImage.index - 1

      // Wrap around
      if (newIndex < 0) {
        newIndex = currentSection.length - 1
      } else if (newIndex >= currentSection.length) {
        newIndex = 0
      }

      setSelectedImage({
        src: currentSection[newIndex],
        sectionName: selectedImage.sectionName,
        index: newIndex,
      })
    },
    [selectedImage, gallerySections, setSelectedImage]
  )

  return { navigateImage }
}
