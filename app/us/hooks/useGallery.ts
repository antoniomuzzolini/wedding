import { useState, useEffect } from 'react'
import { GallerySections } from '../types'

export function useGallery() {
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

  return { gallerySections, loading }
}
