import { ReactNode } from 'react'

interface ModalButtonProps {
  onClick: () => void
  className?: string
  ariaLabel: string
  children: ReactNode
}

export default function ModalButton({ onClick, className = '', ariaLabel, children }: ModalButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`text-white hover:text-wedding-sage-dark transition-colors z-[10000] bg-black/70 hover:bg-black/90 rounded-full p-2 touch-manipulation shadow-lg ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}
