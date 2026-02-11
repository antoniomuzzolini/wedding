import { useEffect } from 'react'
import { SelectedImage } from '../types'

interface UseKeyboardNavigationProps {
  selectedImage: SelectedImage | null
  onClose: () => void
  onNavigate: (direction: 'prev' | 'next') => void
}

const KEYBOARD_KEYS = {
  ESCAPE: 'Escape',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
} as const

export function useKeyboardNavigation({
  selectedImage,
  onClose,
  onNavigate,
}: UseKeyboardNavigationProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return

      switch (e.key) {
        case KEYBOARD_KEYS.ESCAPE:
          onClose()
          break
        case KEYBOARD_KEYS.ARROW_LEFT:
          onNavigate('prev')
          break
        case KEYBOARD_KEYS.ARROW_RIGHT:
          onNavigate('next')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage, onClose, onNavigate])
}
