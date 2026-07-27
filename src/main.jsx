import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { reloadOnceForNewVersion } from '@/lib/ChunkErrorBoundary.jsx'
import { prefetchHotRoutes } from '@/lib/prefetchHotRoutes.js'

// Deploy novo no ar → chunk antigo some do servidor → import dinâmico falha.
// O Vite avisa por este evento; recarregamos 1x pra pegar a versão nova
// em vez de deixar a tela branca.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadOnceForNewVersion()
})

window.addEventListener('load', prefetchHotRoutes)

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
