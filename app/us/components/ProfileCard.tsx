import Image from 'next/image'

interface ProfileCardProps {
  imageSrc: string
  imageAlt: string
  name: string
}

export default function ProfileCard({ imageSrc, imageAlt, name }: ProfileCardProps) {
  return (
    <div className="bg-white/60 p-8 rounded-lg shadow-lg">
      <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden shadow-lg">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      <h2 className="text-3xl font-serif text-wedding-sage-dark mb-4 text-center">{name}</h2>
    </div>
  )
}
