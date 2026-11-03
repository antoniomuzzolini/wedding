import { MetadataRoute } from 'next'

// Il sito non deve comparire nei motori di ricerca.
// NB: non usiamo "disallow" perché Google deve poter scansionare le pagine
// per leggere il tag "noindex" e quindi rimuoverle dall'indice. Se le
// bloccassimo qui, gli URL già indicizzati potrebbero restare nei risultati.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
  }
}
