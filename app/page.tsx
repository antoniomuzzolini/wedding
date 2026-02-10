import Image from 'next/image'

export default function Welcome() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      {/* Header Image */}
      <div className="w-full max-w-6xl mb-8 relative h-64 md:h-96 rounded-lg overflow-hidden shadow-xl">
        <Image
          src="/images/welcome.jpg"
          alt="Header Matrimonio"
          fill
          className="object-cover"
          priority
        />
      </div>
      
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-serif text-wedding-gold mb-6 animate-fade-in">
          Ci sposiamo!
        </h1>
        <div className="text-2xl md:text-4xl font-serif text-gray-800 mb-8">
          <p className="text-xl md:text-2xl text-gray-600 mt-4">
            Unisciti a noi per il nostro giorno speciale
          </p>
        </div>
        <div className="mt-12 space-y-4">
          <p className="text-xl text-gray-700">Data: <strong>Domenica 13 Settembre 2026</strong></p>
          <p className="text-xl text-gray-700">Luogo: <strong>Villa Caiselli</strong></p>
          <p className="text-lg text-gray-600">Via della Ferrovia 8, Pavia di Udine</p>
        </div>
        <div className="mt-16">
          <a
            href="/confirm"
            className="inline-block bg-wedding-gold text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl"
          >
            Conferma la Tua Presenza
          </a>
        </div>
      </div>
    </div>
  )
}
