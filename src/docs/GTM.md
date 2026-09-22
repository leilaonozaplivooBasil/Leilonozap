# Google Tag Manager — GTM-K2KHK4CB

Instalado em `index.html` em 22/09/2026, a pedido do Vinicius.

> **Decisão do dono, 22/09/2026:** *"o que for velho pode retirar. o que manda
> agora é o que o Vinicius traz."*
> O contêiner é, a partir de hoje, o **único** rastreamento de marketing do site.
> Nada de tag solta no código — nunca mais.

## Onde está

- **`<head>`** — o snippet do contêiner, depois dos `preconnect`/`preload`.
  O GTM é assíncrono e não bloqueia a pintura, mas subir ele acima do `preload`
  do logo atrasaria o LCP sem melhorar medição nenhuma.
- **`<body>`** — o `<noscript>` com o iframe, na primeira linha do body, como a
  própria Google pede.

Só existe **um** `index.html` de verdade no projeto. Os outros `.html` estão em
`tests/navegador/` e são bancadas de teste — não levam tag.

## 🧹 O que saiu junto (e precisa voltar DENTRO do contêiner)

Estas três medições rodavam soltas no código. Foram removidas na mesma mudança.
**Enquanto não forem recriadas no contêiner, elas não existem mais.**

| O que era | ID | Onde estava | Quem precisa recriar |
|---|---|---|---|
| Google Analytics 4 | `G-YS4W9104X6` | `gtag.js` no `<head>` do `index.html` | tag **GA4 Configuration** |
| Meta Pixel — leilões | `1765569374618252` | `Home.jsx` (PageView) e `Register.jsx` (Lead) | tag **Meta Pixel** |
| Meta Pixel — Rank Premiado | `1434558685189211` | `ConcursoLeilaoNozap.jsx` (PageView) | tag **Meta Pixel** |

O Datadog RUM (`index.html`) **ficou**: é monitoramento de erro e performance,
não é marketing.

## ⚠️ Três coisas pra quem for configurar o contêiner

### 1. O site é uma SPA — o Pageview padrão não basta

Navegar de `/Loja-Virtual` para `/leiloes` não recarrega a página. O gatilho
**Pageview** só dispara na primeira carga; para o resto é o gatilho
**History Change**.

Isso não é detalhe: as duas páginas de maior tráfego (Home/leilões e Rank
Premiado) são justamente as que o visitante mais alcança por navegação interna.
Era exatamente por isso que existiam aqueles `useEffect` de PageView no código —
o problema não sumiu, só mudou de dono.

### 2. Os dois funis não podem se misturar

O **Rank Premiado** (`/ConcursoLeilaoNozap`) e os **leilões** (`/Home`,
`/leiloes`) são campanhas diferentes, de contratantes diferentes. Tinham pixels
separados por isso — e a separação já quebrou uma vez, em 31/08/2026, quando um
`track` genérico mandou o PageView de uma página para o pixel da outra.

No contêiner, separar por **caminho da URL** ou pelo campo **`lead_type`** do
evento `lead`. Se as duas campanhas caírem na mesma tag, o histórico de
conversão das duas fica errado e não tem como desfazer depois.

### 3. Não repita o que já está no dataLayer

O site empurra evento próprio (tabela abaixo). Criar uma tag que dispara "em
tudo" **e** uma tag em cima do evento nomeado conta a mesma coisa duas vezes.

## 🎁 O site já empurra 6 eventos pro dataLayer

`src/lib/tracking.js` existe desde 11/08/2026 e foi escrito justamente para o dia
em que o GTM entrasse. Ele nunca dependeu do GTM estar instalado — só empurra
para `window.dataLayer`. Ou seja: **esses eventos já estão disponíveis como
gatilho, sem escrever uma linha de código nova.**

| `event`           | Quando dispara                        | Campos                                              |
|-------------------|---------------------------------------|-----------------------------------------------------|
| `section_enter`   | Ao entrar numa seção da página        | `page_section`, `page_path`, `page_title`           |
| `section_time`    | Ao sair da seção                      | `page_section`, `time_spent_seconds`                |
| `cta_click`       | Clique em botão de ação               | `cta_name`, `page_section`                          |
| `lead`            | **Cadastro efetuado** (definição do dono, 31/08/2026) | `lead_type`, `page_section`      |
| `begin_checkout`  | Início de checkout                    | `checkout_type`, `value`, `currency` (`BRL`), `page_section` |
| `purchase`        | Compra concluída                      | `transaction_type`, `value`, `currency` (`BRL`), `page_section` |

Todos levam `timestamp` junto.

No GTM, o gatilho é **Custom Event** com o nome exato da coluna `event`.

`lead_type` vale `'cadastro'` ou `'cadastro_google'`. É por ele que se separa a
origem do lead — ver o item 2 acima.
