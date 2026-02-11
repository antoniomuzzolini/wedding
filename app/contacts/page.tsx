export default function Contacts() {
  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-serif text-wedding-sage-dark text-center mb-12">
          Contatti
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white/80 p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-serif text-wedding-sage-dark mb-4">Francesca Poles</h2>
            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Email:</strong> <a href="mailto:francescapoles99@gmail.com">francescapoles99@gmail.com</a>
              </p>
              <p>
                <strong>Telefono:</strong> <a href="tel:+393451285879">+39 345 128 5879</a>
              </p>
            </div>
          </div>

          <div className="bg-white/80 p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-serif text-wedding-sage-dark mb-4">Antonio Muzzolini</h2>
            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Email:</strong> <a href="mailto:antoniomuzzolini@gmail.com">antoniomuzzolini@gmail.com</a>
              </p>
              <p>
                <strong>Telefono:</strong> <a href="tel:+393297089218">+39 329 708 9218</a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-white/80 p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-serif text-wedding-sage-dark mb-6 text-center">
            Informazioni sulla Location
          </h2>
          <div className="text-gray-700 space-y-3 text-center mb-6">
            <p>
              <strong>Luogo:</strong> Villa Caiselli
            </p>
            <p>
              <strong>Indirizzo:</strong> Via della Ferrovia 8, Pavia di Udine
            </p>
            <p>
              <strong>Data:</strong> Domenica 13 Settembre 2026
            </p>
          </div>
          
          {/* Google Maps */}
          <div className="mt-6 rounded-lg overflow-hidden shadow-lg">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2771.996443899672!2d13.258234776135293!3d45.99130027108735!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x228c53f1283e8c1d%3A0x523e5631c9615f4c!2sVilla%20Caiselli%20-%20Casa!5e0!3m2!1sit!2sit!4v1770630054999!5m2!1sit!2sit"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mappa Villa Caiselli"
              className="w-full"
            />
            <p className="text-sm text-gray-600 mt-2 text-center">
              <a
                href="https://maps.app.goo.gl/ZRsAMHkpABFBpDu28"
                target="_blank"
                rel="noopener noreferrer"
                className="text-wedding-sage-dark hover:underline"
              >
                Apri in Google Maps
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
