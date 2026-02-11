import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="mt-auto">
      {/* Footer Image */}
      <div className="w-full relative h-48 md:h-64 overflow-hidden">
        <Image
          src="/images/headers/footer.jpg"
          alt="The Puzzles Wedding - Footer"
          fill
          className="object-cover"
        />
      </div>
      
      {/* Footer Text */}
      <div className="bg-wedding-sage-dark/10 py-8 text-center">
        <p className="text-gray-700 font-serif">
          Fatto con ❤️ per il nostro giorno speciale
        </p>
        <p className="text-sm text-gray-600 mt-2">
          © {new Date().getFullYear()} Tutti i diritti riservati
        </p>
      </div>
    </footer>
  )
}
