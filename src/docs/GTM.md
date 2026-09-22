# Google Tag Manager — GTM-K2KHK4CB

Instalado em `index.html` em 22/09/2026, a pedido do Vinicius.

## Onde está

- **`<head>`** — o snippet do contêiner, logo acima do bloco do gtag.js.
  Fica depois dos `preconnect`/`preload` de propósito: o GTM é assíncrono e não
  bloqueia a pintura, mas subir ele acima do `preload` do logo atrasaria o LCP
  sem melhorar medição nenhuma.
- **`<body>`** — o `<noscript>` com o iframe, na primeira linha do body, como a
  própria Google pede.

Só existe **um** `index.html` de verdade no projeto. Os outros `.html` estão em
`tests/navegador/` e são bancadas de teste — não levam tag.

## ⚠️ Duas coisas pra quem for mexer no contêiner

### 1. O GA4 já está no site por fora do GTM

O `gtag.js` do **G-YS4W9104X6** continua carregado direto no `index.html`, como
sempre esteve. Se o contêiner também tiver uma tag **GA4 Configuration** com
esse mesmo ID, **o pageview conta duas vezes** e todo o relatório de sessões
fica inflado.

Escolher um dos dois:

- **A** — o contêiner NÃO mede GA4 (só Meta, Ads, etc.) e o `gtag.js` fica onde
  está; ou
- **B** — o GA4 passa a ser servido pelo contêiner e o bloco `gtag.js` sai do
  `index.html`.

Hoje estamos no **A**. Trocar para o B é mudança de código — não dá pra fazer
só pelo painel do GTM.

### 2. O site é uma SPA — o pageview só dispara na primeira carga

Navegar de `/Loja-Virtual` para `/leiloes` não recarrega a página, então o
*History Change* do GTM **não** dispara sozinho com o gatilho padrão de
Pageview. Quem for montar as tags precisa usar o gatilho **History Change** do
próprio GTM, ou pedir um `dataLayer.push` a cada troca de rota no React Router.

O mesmo vale para o `gtag.js` que já estava aqui: ele também só conta a primeira
carga. Isso é anterior ao GTM e não foi alterado nesta instalação.

## Os pixels da Meta não passam por aqui

`src/lib/metaPixel.js` carrega dois pixels (leilões e Rank Premiado) com
`trackSingle`. Se alguém puser esses mesmos pixels no contêiner também, cada
evento vai contar em dobro. Ler o comentário do topo daquele arquivo antes.

## 🎁 O site já empurra 6 eventos pro dataLayer

`src/lib/tracking.js` existe desde 11/08/2026 e foi escrito justamente para o dia
em que o GTM entrasse. Ele nunca dependeu do GTM estar instalado — só empurra
para `window.dataLayer`. Ou seja: **assim que o contêiner subir, esses eventos já
estão disponíveis como gatilho, sem escrever uma linha de código nova.**

| `event`           | Quando dispara                        | Campos                                              |
|-------------------|---------------------------------------|-----------------------------------------------------|
| `section_enter`   | Ao entrar numa seção da página        | `page_section`, `page_path`, `page_title`           |
| `section_time`    | Ao sair da seção                      | `page_section`, `time_spent_seconds`                |
| `cta_click`       | Clique em botão de ação               | `cta_name`, `page_section`                          |
| `lead`            | **Cadastro efetuado** (definição do dono, 31/08/2026) | `lead_type`, `page_section`      |
| `begin_checkout`  | Início de checkout                    | `checkout_type`, `value`, `currency` (`BRL`), `page_section` |
| `purchase`        | Compra concluída                      | ver `src/lib/tracking.js`                           |

Todos levam `timestamp` junto.

No GTM, o gatilho é **Custom Event** com o nome exato da coluna `event`.
