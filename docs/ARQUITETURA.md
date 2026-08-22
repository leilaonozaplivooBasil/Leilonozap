# ARQUITETURA — Leilão NoZap

> Referência de arquitetura, separada do histórico de investigação
> (`docs/DIARIO.md`) e do estado corrente da frente em auditoria
> (`docs/CLAUDE_HANDOFF.md`). Este arquivo descreve **como o sistema é
> montado**, não o que está sendo corrigido agora. Atualizado quando a
> arquitetura muda de verdade — não é diário, é mapa.

---

## 1. Visão geral

| Camada | Serviço | Papel |
|---|---|---|
| Código | GitHub — `leilaonozaplivooBasil/Leilonozap` | fonte única, `main` protegida |
| Frontend + funções serverless | Vercel — projeto `leilonozap` (`prj_v81Kcn90qp4kUvsnQnKAXfD3L6H0`, team `team_meb2LKJRpX1OcHjvJX5c2xQP`) | build (Vite), deploy automático em push, domínio de produção `leilaonozap.net` |
| Banco/auth/storage | Supabase — projeto `gezvviyegtxytnwjkrjv` (sa-east-1) | única fonte de verdade do estado do banco em produção |
| Pagamento | Mercado Pago | PIX, cartão, webhook (`api/functions/mpWebhook.js`) |
| Logística | Melhor Envio | geração de etiqueta, API externa |

**Stack:** React + Vite no frontend; funções serverless da Vercel em
`api/functions/` (Node), com helpers compartilhados em `api/_lib/`; Radix UI
como base dos componentes de `src/components/ui/`; Tailwind pro estilo.

**Regra de deploy:** push em `main` dispara build e deploy de produção na
Vercel automaticamente. Não existe branch de staging na Vercel além de
Preview deployments por PR — a única exceção conhecida hoje é o projeto
Supabase `preview-staging` (ver seção 4), criado especificamente pra uma
frente de trabalho isolada.

---

## 2. Origem histórica — Base44

O projeto nasceu na Base44 (plataforma de criar app com IA). O SDK e os
servidores da Base44 foram completamente removidos (`src/api/base44Client.js`
→ `src/api/plataformaClient.js`, `base44Adapter.js` → `plataformaAdapter.js`,
identificador `base44` → `plataforma` em ~300 arquivos, 21/08/2026). O que
ficou, de propósito, é só a FORMA da API (`.entities`, `.functions.invoke`)
porque centenas de telas já chamavam esse formato.

**Duas exceções reais e intencionais, que continuam falando com a Base44:**
`api/_lib/base44Runtime.js` e o domínio `base44.app` usado por
`buscarFotosPorImagem.js`, `comparaiPrices.js`, `leilaChat.js`,
`marketSearch.js` — uma ponte servidor-a-servidor ainda ativa. Nunca renomear
essas referências por engano ao mexer no identificador `plataforma`.

---

## 3. Padrão de escrita: rota dedicada vs. rota genérica

`api/functions/entityWrite.js` é uma rota CRUD genérica, com allowlist de
tabelas (`CONTENT_TABLES`), pensada pra conteúdo administrativo simples
(produtos, cupons, banners). **Não é pensada pra registros com regra de
negócio própria.**

`catalog_sales` (venda/pedido) é o exemplo que forçou essa distinção a ficar
explícita: alterar `status` por essa rota genérica contorna estorno,
comissão e escrow. Por isso `entityWrite.js` **bloqueia** escrita de
`status`/`total_amount`/`sale_price`/`commission_total`/`mp_payment_id`/
`buyer_id`/`seller_id` em `catalog_sales`, e existe uma rota dedicada,
`api/functions/updateOrderStatus.js`, que aplica a regra de negócio certa
(inclusive estorno via RPC `cancelar_venda()` quando o status é
cancelamento).

**Regra geral, derivada disso:** qualquer entidade com regra de negócio
própria (dinheiro, estado que dispara efeito colateral) precisa de rota
dedicada — a rota genérica é só pra conteúdo sem consequência financeira.

---

## 4. Gestão de Pedidos — dois campos de status

`catalog_sales` tem **dois campos de status independentes**:

- **`status`** — dirige as abas/contadores da tela de gestão
  (`CatalogOrdersAdmin.jsx`): `pending_payment / paid / shipped / delivered
  / canceled` (inglês, herança da Base44) **e também**
  `preparando / saiu_entrega / entregue / cancelado` (português, usado por
  outras partes do sistema). `updateOrderStatus.js` aceita e grava as duas
  línguas — não existe migração de dado prevista, o banco convive com as
  duas.
- **`fulfillment_status`** — dirige a "Jornada da Entrega"
  (`OrderFulfillmentSteps.jsx`), o que o COMPRADOR vê em "Acompanhar
  Pedido": `a_enviar / preparando / enviado / saiu_entrega / entregue`.

`updateOrderStatus.js` sincroniza os dois campos numa escrita só quando um
lado muda e o outro não é informado explicitamente (mapeamento
`STATUS_TO_FULFILLMENT` no servidor). O dropdown de status na tela de gestão
resolve a tradução PT↔EN **localmente**, no próprio componente da página —
nunca dentro do primitive `select.jsx` compartilhado (ver seção 6).

---

## 5. Melhor Envio

Dado de etiqueta já gerada vive em `raw_base44.melhor_envio` (JSON):
`order_id`, `protocol`, `label_url`. Não existe webhook do Melhor Envio
integrado — confirmado por ausência no código, não verificado contra a
documentação oficial deles. Geração de etiqueta é sob demanda
(`api/_lib/melhorEnvioShipment.js`, disparada automaticamente no pagamento
quando possível, ou manualmente via botão "Reprocessar envio").

---

## 6. Componentes de UI compartilhados nunca carregam regra de página

`src/components/ui/*` (Radix wrappers: `select.jsx`, `dialog.jsx`, etc.) são
usados pelo app inteiro. Regra dura, validada por um incidente real
(21/08/2026): uma correção pontual da tela de Gestão de Pedidos remapeou
valores de status dentro de `select.jsx` — o rótulo mostrava um texto e o
Radix considerava outro valor selecionado por dentro, o que podia gravar
status errado silenciosamente ao reabrir o dropdown sem trocar nada. **Toda
tradução de vocabulário, todo mapeamento específico de uma tela, fica no
componente da PÁGINA — nunca dentro de `src/components/ui/`.**

---

## 7. Ambiente de Preview/Staging isolado (Gestão de Pedidos)

Frente aberta pela OpenAI em 21/08/2026, paralela ao trabalho normal em
`main`:

| Item | Valor |
|---|---|
| Branch destino de produção | `openai/catalog-status-sync` (PR #86) |
| Branch de Preview/staging | `openai/catalog-status-sync-preview` (PR #87) |
| Alias estável do Preview | `leilonozap-git-openai-catalog-status-4593e6-leilaapp-s-projects.vercel.app` |
| Supabase de staging | branch `preview-staging`, project ref `obipnfhwiaafxeqgfeop` — **isolado da produção**, nunca `gezvviyegtxytnwjkrjv` |
| Edge Function de staging | `preview-api` — vive só no Supabase, fora deste repositório |

**Regra permanente:** a PR #87 nunca é mergeada em produção — é harness de
teste. O harness ativa (login fictício de admin + roteamento pro Supabase de
staging) só com DUAS condições simultâneas: hostname de preview E a
variável de ambiente `VITE_PREVIEW_STAGING=true` (configurada só no
ambiente Preview da Vercel, nunca em Production). Isso substitui uma versão
anterior que ativava sozinha só pelo hostname — achado crítico de segurança
corrigido em 21/08/2026 (qualquer visitante de qualquer Preview deste
projeto virava admin sem senha).

---

## 8. Governança de diretivas (a partir de 21/08/2026)

- `docs/PADRAO_DIRETIVAS.md` — o formato fixo (template) que toda diretiva e
  todo relatório de execução seguem.
- `docs/DIRETIVA_ATUAL.md` — a diretiva de engenharia em vigor agora, nesse
  formato.
- `docs/HISTORICO_DIRETIVAS.md` — log append-only da ESPECIFICAÇÃO de toda
  diretiva formal já emitida (o que foi autorizado).
- `docs/RELATORIOS_EXECUCAO.md` — log append-only do RESULTADO de cada
  diretiva executada, um relatório por `DIR-N`.
- Este arquivo (`docs/ARQUITETURA.md`) — referência de arquitetura, atualizado
  quando algo estrutural muda de verdade.
- `docs/CLAUDE_HANDOFF.md` — canal técnico Claude↔OpenAI, estado da frente em
  auditoria agora.
- `docs/DIARIO.md` — registro integral e append-only de toda conversa com o
  dono, incluindo o que não veio no formato de diretiva formal.
