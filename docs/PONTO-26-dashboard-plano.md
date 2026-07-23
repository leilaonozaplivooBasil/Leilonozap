# PONTO 26 — Painel do Concurso NoZap (Dashboard completo)

Arquivo da tela: `src/pages/ConcursoLeilaoNozap.jsx` (317 linhas)
Backend: `api/concurso.js` (242 linhas)
Rota pública: `/concursoleilaonozap`

## O que JÁ existe hoje
- Hero (logo + "CONCURSO").
- Bloco LIVE (quando `live_ativa`): "AO VIVO AGORA", produto, barra de audiência.
  - PROBLEMA: botão "ENTRAR NA LIVE" abre em ABA EXTERNA (`<a target="_blank">`).
- Bloco "Próxima live / destaque" (horário, produto, propaganda).
- Meu Painel / Formulário de cadastro (nome, CPF, WhatsApp, foto → gera link).
- Ranking com abas Hoje/Semana/Mês/Geral — JÁ troca instantâneo, auto-refresh 15s, top 3 destacado.
- Painel Admin (config, live, prêmios por período, sorteio, prêmios do pódio 1-10).
- Layout: coluna única estreita (`max-w-2xl`), mobile-first.

## PONTO 26 pedido × situação
| Item pedido | Situação |
|---|---|
| 1. Ranking 3 abas Dia/Semana/Mês com filtro instantâneo | ✅ já existe (falta só botão expandir + "melhor lugar") |
| 2. Top 3 destaque ouro/prata/bronze | ✅ já existe |
| 3. LIVE embutida DENTRO do painel (nunca abre aba externa) | 🔴 falta: hoje abre externa |
| 4. Virar "dashboard de verdade" (hub) | 🟡 falta reorganizar layout |

## Etapas de execução (propostas)
- ETAPA 1 — LIVE inline: player embutido (YouTube/Instagram/iframe) dentro do painel + admin detecta plataforma.
- ETAPA 2 — Ranking como widget de dashboard: botão expandir/colapsar, "melhor lugar", contagem em tempo real.
- ETAPA 3 — Layout dashboard: reorganizar em cards/grid (live + ranking + destaque + propaganda), responsivo.
- ETAPA 4 — Polimento: comunicação/avisos em tempo real, refino visual "painel do licenciado".

## Fonte do código
- Repo GitHub privado: `agf3xdev/Leilonozap` (migrado do Base44 → Supabase).
- Clonado em `/Users/mac/leilaonozap` via `gh repo clone`.
