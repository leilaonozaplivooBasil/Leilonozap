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

// 👁️ Observabilidade (Sentry + PostHog) — só liga em produção e só com as
// variáveis configuradas. Antes essas libs (replay de sessão, tracking)
// eram importadas ANTES do primeiro render, no caminho crítico. Agora só
// carregam depois que a tela já apareceu e o navegador está ocioso —
// nenhuma tela depende delas pra funcionar, só monitoramento/analytics.
const iniciarObservabilidade = () => {
  import('@/lib/sentry.js').then(({ initSentry }) => initSentry())
  import('@/lib/analytics.js').then(({ initAnalytics }) => initAnalytics())
}
if ('requestIdleCallback' in window) {
  window.requestIdleCallback(iniciarObservabilidade, { timeout: 4000 })
} else {
  setTimeout(iniciarObservabilidade, 2000)
}