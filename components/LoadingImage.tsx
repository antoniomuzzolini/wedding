'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

type LoadingImageProps = ImageProps & {
  wrapperClassName?: string
  skeletonClassName?: string
  showSpinner?: boolean
}

export default function LoadingImage({
  wrapperClassName,
  skeletonClassName,
  showSpinner = true,
  className,
  onLoad,
  onLoadingComplete,
  ...props
}: LoadingImageProps) {
  const [loaded, setLoaded] = useState(false)
  const isFill = 'fill' in props && !!props.fill
  const wrapperBaseClassName = isFill ? 'absolute inset-0' : 'relative'

  return (
    <div className={`${wrapperBaseClassName} ${wrapperClassName || ''}`}>
      {!loaded && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 image-skeleton ${skeletonClassName || ''}`}
        />
      )}

      {!loaded && showSpinner && (
        <div
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center"
        >
          <div className="image-spinner" />
        </div>
      )}

      <Image
        {...props}
        className={[
          className || '',
          'transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onLoad={(e) => {
          setLoaded(true)
          onLoad?.(e)
        }}
        onLoadingComplete={(img) => {
          setLoaded(true)
          onLoadingComplete?.(img)
        }}
      />
    </div>
  )
}

