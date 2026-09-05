# Projeto — Observability da plataforma

> **Status: GUARDADO PARA IMPLEMENTAÇÃO FUTURA. Nada foi construído.**
> Recebido do dono em 05/09/2026. Nenhuma fase foi iniciada.

O documento original vai **íntegro** na segunda metade deste arquivo. Antes dele, um
**inventário inicial medido em 05/09** — o próprio documento pede que o diagnóstico venha
antes de qualquer código, então isto é o ponto de partida dele, não uma auditoria completa.

---

## Inventário inicial (medido, não estimado — 05/09/2026)

### O que já existe e funciona

| Peça | Onde | Estado |
|---|---|---|
| **Sentry** (erros + replay de sessão) | `src/lib/sentry.js` | ✅ funcionando, **só no front-end** |
| **`system_logs`** (tabela) | 61 componentes gravam | ✅ grava, ⚠️ ver abaixo |
| **Logs de runtime da Vercel** | painel Vercel | ✅ existem e são pesquisáveis |
| **`alertaReservasOrfas`** (cron 09:30) | `vercel.json` | ✅ é o único alerta automático da casa |
| **Extratos append-only** (`reserva_ledger`, `campanha_envios`) | migrations | ✅ auditoria de dinheiro e envios |
| **`checar_slack`** (ferramenta da Heloim) | `whatsapp-router` | ✅ diagnóstico sob demanda |

### 🔴 O achado que muda a ordem das prioridades

**`system_logs` tem 2.832.848 linhas.** E a distribuição explica tudo:

| Componente | Linhas | % |
|---|---|---|
| **`GlobalMonitor`** | **2.816.459** | **99,4%** |
| `funcao:checkLocation` | 5.856 | 0,2% |
| `funcao:getServerTime` | 3.439 | 0,1% |
| `funcao:getRecommendations` | 2.692 | 0,1% |
| `systemHealthCheck` | 1.218 | — (parou em 27/08) |
| `sendAuctionReminder24h` | 1.043 | — (parou em 27/08) |

Um único componente escreveu **99,4% de toda a tabela de logs** em 30 dias. Isso não é
observabilidade — é ruído que **esconde** o sinal, custa armazenamento e torna qualquer
busca lenta. Nos últimos 7 dias foram 6.430 linhas no total, então o volume caiu; mas as
2,8 milhões continuam lá.

**Antes de adicionar qualquer coleta nova, é preciso descobrir por que o `GlobalMonitor`
grava tanto e definir retenção.** O documento é explícito: *"Evite coletar informações sem
propósito"* e *"Primeiro descubra por que não funciona"*.

Dois componentes (`systemHealthCheck` e `sendAuctionReminder24h`) **pararam em 27/08** e
não gravam mais nada. Um deles é literalmente um health check — cabe descobrir se morreu
ou se foi desativado de propósito.

### O que não existe

- **Nenhuma rota de health check** (`/api/health`) — não há como perguntar ao sistema se
  ele está UP, DOWN ou DEGRADED.
- **Nenhum trace distribuído.** Uma compra passa por front → Vercel Function → Supabase →
  Mercado Pago → webhook, e não há um id que atravesse essa cadeia.
- **Nenhuma métrica** de negócio ou de infra coletada de forma estruturada.
- **Sentry não cobre o servidor.** Os ~195 `console.error/warn/log` das funções da Vercel e
  da Edge Function só existem no log da Vercel — erro de servidor não vira alerta.
- **Nenhum dashboard de operação.** Há telas de negócio, não de saúde da plataforma.

### Ordem que eu proporia (a confirmar quando o projeto for retomado)

| Fase | O quê | Por quê primeiro |
|---|---|---|
| **0** | Diagnóstico do `GlobalMonitor` + política de retenção | limpar o ruído antes de somar sinal |
| **1** | Padronizar o log de servidor e ligar o Sentry no back-end | erro de servidor hoje não avisa ninguém |
| **2** | Health check por componente (UP/DOWN/DEGRADED) | é o que o documento pede explicitamente |
| **3** | Métricas úteis e poucas | depois de saber o que dói |
| **4** | Trace distribuído com id único ponta a ponta | o mais caro, e o que mais reduz tempo de diagnóstico |
| **5** | Dashboard e alertas que ajudem de verdade | depende de 1–4 |

### Uma nota sobre segurança que já vale hoje

O documento manda mascarar dado sensível. O `sentry.js` **já faz isso no front** — corta a
gravação de sessão em checkout, pagamento, carteira e cadastro, por LGPD. Esse mesmo
cuidado precisa existir do lado do servidor **antes** de centralizar log de back-end,
não depois: as funções lidam com CPF, PIX, endereço e token.

---

## Documento original, na íntegra

> O que vem abaixo é o texto recebido do dono, sem uma vírgula alterada.

---

# MISSÃO

Você conhece toda a arquitetura da Leilão NoZap porque foi você quem projetou e implementou praticamente todo o ecossistema da plataforma.

Portanto, considere todo o contexto do projeto já conhecido.

Não trate este prompt como o início de um projeto novo.

Trate-o como uma evolução da arquitetura existente.

Sua missão agora é elevar nossa plataforma para um nível profissional de **Observability**, garantindo visibilidade completa sobre toda a infraestrutura, aplicações, serviços, banco de dados, filas, workers, integrações e processos internos.

Seu objetivo NÃO é simplesmente instalar ferramentas.

Seu objetivo é garantir que toda a plataforma seja totalmente observável, auditável, rastreável e facilmente diagnosticável.

---

# PRINCÍPIO MAIS IMPORTANTE

Antes de criar qualquer coisa nova, faça um diagnóstico profundo de tudo que já existe.

Você conhece o projeto.

Você conhece o código.

Você conhece a arquitetura.

Você conhece todas as decisões técnicas tomadas anteriormente.

Portanto:

- descubra exatamente o estado atual da observabilidade;
- identifique tudo que já foi iniciado;
- identifique implementações incompletas;
- identifique implementações abandonadas;
- identifique configurações quebradas;
- identifique configurações desatualizadas;
- identifique integrações parcialmente funcionais.

Não assuma que algo precisa ser substituído apenas porque não está funcionando.

Primeiro descubra **por que** não funciona.

---

# PRIORIDADE

A prioridade é sempre:

1. Reaproveitar.

2. Corrigir.

3. Completar.

4. Validar.

5. Somente substituir quando existir uma justificativa técnica clara e mensurável.

Caso exista uma solução tecnicamente superior, apresente:

- vantagens;
- desvantagens;
- impacto da migração;
- custo técnico;
- esforço;
- riscos;
- benefício esperado.

---

# ESCOPO

Realize uma auditoria completa da camada de observabilidade da plataforma.

Analise absolutamente tudo que já existe.

Exemplos (não limitados a):

- logs
- métricas
- traces
- dashboards
- monitoramento
- alertas
- exporters
- collectors
- health checks
- telemetria
- profiling
- monitoramento de banco
- monitoramento de filas
- monitoramento de workers
- monitoramento de APIs
- monitoramento de processos internos
- monitoramento de jobs
- monitoramento de serviços
- monitoramento da infraestrutura

---

# O QUE ESPERO ENCONTRAR

Quero saber exatamente:

O que já existe.

O que funciona.

O que existe mas está incompleto.

O que existe mas nunca foi finalizado.

O que está obsoleto.

O que está duplicado.

O que está gerando dívida técnica.

O que deveria existir e ainda não existe.

---

# LOGS

Analise toda a estratégia atual de logging.

Verifique:

padronização

estrutura

contexto

níveis

performance

centralização

pesquisa

retenção

traceabilidade

Caso existam logs espalhados ou inconsistentes, proponha uma padronização única para toda a plataforma.

---

# MÉTRICAS

Verifique todas as métricas atualmente disponíveis.

Identifique lacunas.

Sugira novas métricas importantes.

Priorize métricas realmente úteis para operação.

Evite coletar informações sem propósito.

---

# DISTRIBUTED TRACING

Verifique se já existe alguma estratégia de rastreamento.

Caso exista parcialmente implementada:

corrija.

complete.

valide.

Caso não exista:

projete uma arquitetura adequada para a realidade da plataforma.

---

# DASHBOARDS

Audite todos os dashboards existentes.

Verifique:

utilidade

qualidade

organização

clareza

performance

informação redundante

Caso necessário:

reorganize completamente.

---

# ALERTAS

Analise todos os alertas existentes.

Identifique:

alertas inúteis

alertas excessivos

alertas ausentes

falsos positivos

falsos negativos

Quero alertas que realmente ajudem na operação.

---

# HEALTH CHECKS

Audite todos os serviços.

Cada componente importante da plataforma deve possuir um mecanismo claro para indicar:

UP

DOWN

DEGRADED

Caso isso não exista, implemente.

---

# PERFORMANCE

Avalie o impacto da observabilidade sobre o sistema.

Garanta que:

coleta

logs

métricas

traces

profiling

não degradem significativamente a plataforma.

---

# SEGURANÇA

Garanta que nenhuma informação sensível seja registrada.

Nunca registrar:

senhas

tokens

cookies

segredos

credenciais

informações confidenciais

Aplicar mascaramento automático sempre que necessário.

---

# DOCUMENTAÇÃO

Toda a camada de observabilidade deve possuir documentação técnica completa.

Documente:

arquitetura

componentes

fluxos

dependências

dashboards

alertas

métricas

logs

traces

processo de troubleshooting

boas práticas

---

# VALIDAÇÃO

Nenhuma implementação será considerada concluída apenas porque o código foi escrito.

Após cada etapa:

teste.

valide.

simule falhas.

confirme funcionamento.

gere evidências.

Caso algum componente não funcione corretamente, continue investigando até descobrir a causa raiz.

---

# FORMA DE TRABALHO

Quero que você trabalhe exatamente como um Principal Engineer faria.

Antes de alterar qualquer linha de código:

1. Faça um inventário completo da situação atual.

2. Produza um diagnóstico técnico detalhado.

3. Identifique todas as oportunidades de melhoria.

4. Classifique cada problema por impacto e prioridade.

5. Defina um roadmap de implementação.

6. Execute por fases.

7. Valide cada fase antes de iniciar a próxima.

---

# OBJETIVO FINAL

Ao final deste trabalho, quero que a Leilão NoZap possua uma camada de observabilidade madura, consistente e confiável.

Quero ter visibilidade completa do comportamento da plataforma em tempo real.

Quero conseguir identificar rapidamente qualquer falha, gargalo ou degradação.

Quero reduzir drasticamente o tempo necessário para diagnosticar problemas.

Quero que a observabilidade deixe de ser apenas uma ferramenta de monitoramento e passe a ser um componente estratégico da arquitetura da plataforma.

Não implemente soluções apenas porque são populares.

Implemente a solução mais adequada para a arquitetura atual da Leilão NoZap, aproveitando ao máximo tudo o que já existe, eliminando dívida técnica e validando continuamente que cada componente realmente funciona.