export interface GallerySections {
  [sectionName: string]: string[]
}

export interface SelectedImage {
  src: string
  sectionName: string
  index: number
}
