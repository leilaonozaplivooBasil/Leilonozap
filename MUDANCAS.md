# 📋 MUDANÇAS — Diário de Bordo do Backend

> ⚠️ **Documento soberano: [`docs/VERDADE.md`](docs/VERDADE.md). Em caso de conflito, ele vence.**
> Este arquivo é o **4º** na hierarquia: **diário HISTÓRICO, NÃO É REGRA.** Ele conta o que foi
> feito em cada data — não o que vale hoje. **Nunca extraia regra daqui.**

> **Para o time do front:** toda alteração feita no backend é registrada aqui, em português,
> da mais recente pra mais antiga. Leia este arquivo pra saber **o que mudou a cada entrega.**
>
> **Formato de cada registro:**
> - **Data** · **O que mudou** · **Arquivos** · **Impacto no front** · **Risco**

---

## 05/08/2026 — 🔎 PONTO 89 (BLOCO 1): INVENTÁRIO DO BANCO ANTIGO — **100% LEITURA, NADA ALTERADO**

### Natureza

Auditoria de leitura. **Nenhum arquivo de código alterado, nenhum registro criado, alterado ou
apagado.** Único arquivo escrito: este diário.

### Descoberta central (medida, não suposta)

Existem **dois bancos vivos**: o **Supabase** (oficial, coluna `created_at`) e o **store interno
do Base44** (coluna `created_date`). O dado de NEGÓCIO do store interno está **congelado na
migração** — mas o store interno **continua recebendo gravação HOJE**.

| Entidade no store interno | Registro mais recente | Leitura |
|---|---|---|
| `SystemLog` | **05/08 16:58** (minutos antes da auditoria) | 🔴 **gravando agora** |
| `DigitalWallet` | **30/07 23:10** — 3 carteiras criadas no mesmo segundo (lote) | 🟡 **tem saldo em R$** |
| `AppUser` | 27/05 | congelado |
| `CatalogSale` | 24/05 | congelado |
| `CommissionRecord` | 21/05 | congelado |
| `Auction` | 19/04 | congelado |

### Quem ainda escreve no banco antigo (evidência: 120 registros de hoje, 05:14 → 16:58)

| Função | Registros hoje | O que grava | Classificação |
|---|---|---|---|
| `systemHealthCheck` | **94** | `SystemLog` | 🟢 LOG — descartável |
| `sendAuctionReminder24h` | **24** | `SystemLog` | 🟢 LOG — descartável |
| `cleanExpiredCatalogSales` | **2** | `SystemLog` **+ cancela venda** | 🔴 **DADO DE NEGÓCIO** |

### 🔴 DOIS ACHADOS GRAVES — REPORTADOS, **NÃO CORRIGIDOS**

1. **`cleanExpiredCatalogSales` faz `CatalogSale.update(status:'canceled')` no store interno.**
   É escrita de dado de negócio (cancelamento de venda) no banco errado. Pela regra do próprio
   comando desta tarefa, **PAREI e não alterei** — exige autorização própria.
2. **`sendAuctionReminder24h` LÊ `Auction`, `FavoriteAuction` e `AppUser` do store interno**, cujo
   dado está congelado desde abril/maio. Por isso o log dele diz **"Notificados: 0"**: o lembrete
   de 24h provavelmente **não avisa ninguém há meses**. Não é só destino de log — é a leitura que
   está no banco errado. Mesmo caso em `systemHealthCheck`, que testa conectividade e conta erros
   contra o banco **antigo** — ou seja, o health check **não mede o banco de produção**.

### Veredito do inventário

- ✅ **Pode ser apagado sem perda:** os registros de `SystemLog` do store interno (log puro).
- ⚠️ **Exige sua decisão:** `DigitalWallet` do store interno tem **saldo em reais**
  (ex.: R$ 23,98 · R$ 6,00 · R$ 75,10). Antes de apagar, é preciso confirmar que esses valores já
  existem na Supabase — **não conferi isso neste bloco e não vou supor**.
- ⛔ **Nada foi apagado.**

### Limite declarado desta auditoria

A varredura de "toda função que grava no store interno" foi feita **por evidência de gravação
real** (quem apareceu no log), não por leitura das ~200 funções uma a uma. Função que grave no
store antigo **sem gerar log** e que **não rodou nos últimos 7 dias** pode não estar nesta lista.

### Risco

🟢 **Baixo** — leitura pura.

---

## 05/08/2026 — ✅ PONTO 88 (FASE 2B): O DIAGNÓSTICO VOLTOU A MOSTRAR OS LOGS

### O que mudou

`src/pages/SystemDiagnostics.jsx` — **duas linhas de ordenação**. A leitura de `SystemLog` e de
`ComparaiLog` passou de `-created_date` para `-created_at`, com comentário-trava nos dois pontos.
No cartão de log, a data ganhou `created_at` como alternativa
(`created_date || created_at || timestamp`) — **nada removido**, só compatibilidade.

### Por que

A coluna `created_date` **não existe** nessas tabelas. O banco recusava a consulta inteira
(`42703`) e a lista voltava **vazia em silêncio** — por isso as abas mostravam **(0)** tendo
centenas de registros gravados. A tela de diagnóstico era decorativa: numa reclamação real de
cliente, o dono abria e **não via nada**. É o **mesmo erro** que eu cometi na Fase 2 e corrigi no
componente novo; aqui ele já existia antes.

### ✅ RESULTADO MEDIDO — ANTES × DEPOIS

| | Antes | Depois |
|---|---|---|
| Aba Sistema | **(0)** | **(200)** |
| Aba CompareAQUI | **(0)** | **(200)** |
| Bate com o banco? | — | ✅ **200 e 200**, conferido por consulta direta |

Demais checagens: filtro de status funcionando (200 → **0** em ERROR → 200 em "Todos") ·
**Exportar** ativo · **Ações de Reparo** (Encerrar Leilões Expirados / Health Check) ativas ·
celular **sem rolagem lateral** · nenhum erro novo de console (os 2 presentes são
pré-existentes e sem relação: checagem de sessão com usuário deslogado e aviso de propriedade
de imagem no cabeçalho).

### NÃO foi tocado

Filtros, abas, contadores, Exportar, Ações de Reparo, layout, cores, textos ·
`ResumoErros24h.jsx` · `base44Adapter.js` · `GlobalMonitor.jsx` · `logDedupe.js` · comissão,
carteira, saldo, pagamento, lance, checkout, frete, estoque, auth, RLS · nenhuma migration,
entidade, tabela ou função de servidor. **Zero escrita no banco.**

### ⚠️ Observação registrada (sem ação)

Com a tela funcionando, ficou visível que **100% do volume de avisos é um único problema
repetido 500x: "Requisição lenta" do GlobalMonitor.** Pode ser lentidão real afetando cliente —
investigação é outro ponto, outra autorização.

### Risco

🟡 **Médio** — só ordenação de leitura de tela. Pior cenário de falha seria continuar mostrando
zero, exatamente como já estava.

---

## 05/08/2026 — 📊 PONTO 88 (FASE 2): PAINEL DE ERROS + LIMPEZA DA ÁREA "SISTEMA"

### O que foi feito (3 partes, só tela e menu)

1. **Resumo em português no Diagnóstico do Sistema.** Componente NOVO em
   `src/components/system/ResumoErros24h.jsx`, importado no topo de
   `src/pages/SystemDiagnostics.jsx`. Mostra das últimas 24h: total de erros, total de
   avisos, quantos vieram de celular e quantos de computador, os 5 problemas que mais
   repetiram (agrupados) e um **destaque vermelho separado** quando o erro toca área de
   dinheiro (pagamento, comissão, saldo, carteira, lance, frete, pedido). Só leitura.
2. **Página falsa removida.** `src/pages/ErrorReport.jsx` e
   `src/components/system/ErrorDiagnostic.jsx` apagados: eram um documento **estático**
   com 10 erros escritos à mão, sem ler nada do banco, citando linhas de arquivo que já
   não existem. Confirmado por leitura que só `pages.config.jsx` referenciava a página e
   só `ErrorReport.jsx` importava o componente — as duas entradas saíram do arquivo de rotas.
3. **Menu organizado.** `src/lib/adminMenu.js` — grupo "Sistema" ganhou **"Sentinel (IA)"**
   (ícone lucide `ShieldCheck`) apontando para `SentinelNoZap`, que já existia com rota
   protegida por admin mas estava **órfã**, fora do menu.

### 🔴 DOIS DEFEITOS REAIS DESCOBERTOS NO TESTE

1. **A coluna do banco é `created_at`, NÃO `created_date`.** Minha primeira versão ordenava
   por `created_date` e o banco **recusou a consulta inteira** (`42703`). Corrigido para
   `-created_at`, com comentário-trava no código.
2. **O agrupamento nasceu inútil.** "Requisição lenta: 26252ms" e "…: 27469ms" contavam como
   problemas diferentes → tudo aparecia como "1x". Passou a ignorar os números na
   comparação. Depois da correção: **445x** e **55x** — agora serve para algo.

### ✅ VALIDAÇÃO COM DADO REAL DO BANCO

| Teste | Resultado |
|---|---|
| Resumo aparece com dado real | ✅ **500 avisos** reais nas 24h, conferido direto no banco |
| Números da tela x números do banco | ✅ **batem** (0 erros / 500 avisos / 500 computador) |
| Agrupamento por repetição | ✅ **445x** e **55x** após a correção |
| Aviso de amostra em volume alto | ✅ aparece ("500 registros mais recentes") |
| Abas, filtros, Exportar e Ações de Reparo | ✅ **intactos** |
| Celular (sem rolagem lateral) | ✅ ok |
| Rota da página falsa | ✅ removida do arquivo de rotas antes de apagar os arquivos |

### ⚠️ ACHADO GRAVE — **NÃO CORRIGIDO** (fora do escopo autorizado)

**A página Diagnóstico do Sistema já estava quebrada antes desta fase.** As 3 abas
(`Sistema`, `CompareAQUI`, `Frontend`) mostram **(0)** porque a leitura própria dela também
ordena por `created_date` — a mesma coluna inexistente. Ou seja: **existem 500 registros no
banco e a tela mostrava zero.** O prompt desta fase proibiu explicitamente alterar a leitura
de logs existente, então **deixei como está e estou reportando.** Precisa de autorização
própria (troca de `-created_date` por `-created_at` em `SystemLog` e `ComparaiLog`).

### NÃO foi tocado

Comissão, carteira, saldo, pagamento, lance, checkout, frete, estoque, auth, RLS, banco,
migrations, entidades · `base44Adapter.js`, `GlobalMonitor.jsx`, `logDedupe.js` · as abas,
filtros, exportação e ações de reparo da página · nenhuma entidade, tabela ou função de
servidor criada.

### Risco

🟡 **Médio** — tela e menu. O componente novo é só leitura e, se a consulta falhar, mostra o
motivo em vez de derrubar a página.

---

## 05/08/2026 — 🕵️ PONTO 88 (FASE 1): FECHAR O CERCO DOS ERROS — só captura

### O que estava cego (medido por leitura, não por suposição)

1. **Erro de servidor não deixava rastro NENHUM.** Todas as ~190 chamadas de servidor passam
   por **um único funil** (`invokeFunction`, em `src/api/base44Adapter.js`), e ele engolia a
   falha em 3 caminhos: 404/405/501 virava stub, erro 400/500 era devolvido como JSON que
   **ninguém conferia**, e falha de rede virava stub. Inclui os fluxos de dinheiro —
   pagamento, comissão, lance, frete, carteira.
2. **O `GlobalMonitor` detectava 7 problemas e gravava só 1.** Loop infinito de renderização,
   erro de hooks, requisição lenta, rate limit, excesso de requisições e erro de rede iam para
   o estado da tela e para o **`localStorage` do dispositivo do usuário** — morriam no celular
   dele. O dono nunca via.

### O que mudou (2 arquivos, só observação)

- `src/api/base44Adapter.js` — **apenas** `invokeFunction`. Passou a registrar em 4 assinaturas
  distintas: `Servidor_Erro_Resposta` (400/500), `Servidor_Funcao_Inexistente` (rota não existe),
  `Servidor_Resposta_Negocio` (404 com JSON de recusa) e `Servidor_Falha_Rede`. Cada registro leva
  nome da função, status HTTP, mensagem, rota, URL da tela e se é celular.
- `src/components/system/GlobalMonitor.jsx` — **apenas** `addIssue`. Cada problema detectado passa
  também pelo gravador. `critical` → `error`; `warning` → `warning`. localStorage e alerta visual
  **idênticos**.

### 🔴 DUAS ARMADILHAS ENCONTRADAS E RESOLVIDAS

1. **Dependência circular:** `logDedupe` importa o `base44`, que é o **próprio adapter**.
   Import no topo criaria ciclo e podia quebrar o carregamento do app inteiro. Solução: o
   gravador é carregado **sob demanda**, só no instante do erro. **Comentário-trava no código
   proibindo mover para o topo.**
2. **Detecção incompleta, achada NO TESTE (não em teoria):** a primeira versão só reconhecia
   `success/ok/error`. O primeiro teste real devolveu um erro com as chaves `error_type` e
   `detail` (formato da plataforma) e **passou em branco**. Corrigido para cobrir as duas formas.
   Sem esse teste, teria ficado um furo silencioso.

### ✅ VALIDAÇÃO COM NÚMEROS MEDIDOS

| Teste | Resultado |
|---|---|
| Erro de servidor real provocado pelo funil | ✅ **gravou** (lido de volta do banco) |
| **5 chamadas com o MESMO erro** | ✅ **1 registro** por assinatura |
| Chamada com erro **DIFERENTE** | ✅ **registro próprio** (assinatura por função funciona) |
| Retorno de `invokeFunction` | ✅ **idêntico** ao de antes em todos os casos testados |
| Site computador + celular (abertura e Loja) | ✅ normal, **sem rolagem lateral**, zero erro de console |
| Dados de teste | ✅ **3 criados, 3 apagados, 0 sobras** (confirmado por releitura) |

### NÃO foi tocado

`entities`, `auth`, `integrations`, `analytics`, `TABLE_MAP`, `FIELD_MAP`, `_routeWrite`,
`invokeIntegration`, `UploadFile` · a intercepção de fetch, o `console.error` e o handler global
do monitor · o visual do alerta · `logDedupe.js` · **comissão, carteira, saldo, pagamento, lance,
checkout, frete, estoque, auth, RLS e banco de dados** — nenhuma linha, nenhuma migration,
nenhuma tabela nova, nenhuma entidade nova.

### ⚠️ Limites declarados desta fase

- Erro que estoura **dentro** da função da Vercel antes de responder continua só no painel da
  Vercel. O funil registra "o servidor respondeu erro", não o detalhe interno dele.
- **Não** foi feito: painel de erros em tempo real (Fase 2) e varredura dos `catch` silenciosos
  (Fase 3).
- Validação rodou no ambiente de teste com usuário **deslogado** (caminho de gravação anônimo).
  Com admin logado a gravação passa por outra rota de escrita — **não testado** nesta fase.

### Risco

🟡 **Médio** — mexe no funil por onde passa TODA chamada de servidor. Mitigado: o gravador nunca
lança erro, é carregado sob demanda, o valor de retorno não muda em nenhum caminho, e a
dependência circular foi identificada **antes** de rodar.

---

## 05/08/2026 — ✅ BLOCO: RESTAURAR-HISTORICO-SISTEMA (`system_logs` era uma casca) — **RESOLVIDO E VALIDADO**

### O que foi descoberto (por teste real, não suposição)

A tabela **`system_logs` é uma CASCA** da migração Base44 → Supabase. As únicas colunas que
existem são `id`, `base44_id`, `created_at`, `updated_at`. **Nenhuma coluna de conteúdo existe.**

Consequência medida no preview: **TODO `SystemLog.create()` falha**, com
`Could not find the 'component_name' column of 'system_logs' in the schema cache`.
Ou seja: **o app não tem NENHUM diagnóstico de erro gravado.** Se um usuário reclamar
"deu erro ao dar lance", **não existe registro para consultar.**

Isso passou invisível porque o gravador de log é (corretamente) silencioso — ele nunca
derruba o fluxo do usuário quando falha. O silêncio escondeu a casca.

### O que mudou

- Criada `supabase/migrations/20260805_system_logs_restaurar_colunas.sql`, **puramente aditiva**:
  `ADD COLUMN IF NOT EXISTS` para `entity_id`, `component_name`, `step`, `status`, `message`,
  `error_details` (jsonb), `user_agent`, `is_mobile`, `url`, `execution_time_ms`,
  `payload` (jsonb) e `created_by_id`.
- **Todas nullable, nenhum DEFAULT obrigatório** — gravar log JAMAIS pode falhar por validação
  e derrubar um fluxo real.
- `status` é **`text` e NÃO enum**, de propósito: um status novo no app nunca pode fazer a
  gravação do log falhar.
- Índices `idx_system_logs_created_at` (created_at DESC) e `idx_system_logs_status`, para a
  consulta do painel não pesar quando o volume crescer.
- **Idempotente:** pode rodar duas vezes sem quebrar.

### ⚠️ Ordem obrigatória de aplicação

Escrever o arquivo `.sql` **não executa nada**. DDL só acontece rodando o SQL no **SQL Editor
do Supabase** (ou via `supabase db push` no deploy). ✅ **Executado por Gabriel em 05/08/2026.**

### 🔒 PARTE 2 — A SEGUNDA TRAVA (não estava prevista)

Com as colunas criadas, a gravação **continuou falhando** — mas com **outro erro**:

```
new row violates row-level security policy for table "system_logs"
```

A tabela tinha RLS ligada e **nenhuma política de escrita**: as colunas existiam, mas ninguém
tinha autorização para inserir — nem o app. Criada
`supabase/migrations/20260805_system_logs_politica_insert.sql` (autorizada por Gabriel e
executada em 05/08), com a política `system_logs_insert_publico`:

| Operação | Quem pode | Por quê |
|---|---|---|
| `INSERT` | `anon` + `authenticated` | erro de front acontece também com visitante **deslogado** (vitrine da Recepção) — sem `anon`, justamente os erros mais críticos ficariam invisíveis |
| `SELECT` | só admin / service_role | ninguém vê o log de ninguém |
| `UPDATE` / `DELETE` | **ninguém** pelo app | log **append-only**, à prova de adulteração |

**📌 Regra permanente de leitura de erro** (para não confundir as duas travas):
`Could not find the '<coluna>' column` = **coluna não existe**.
`new row violates row-level security policy` = coluna existe, **falta permissão**.

### ✅ VALIDAÇÃO COM NÚMEROS MEDIDOS (05/08/2026, no app real)

| Teste | Resultado |
|---|---|
| Gravar registro com **todos os 11 campos** | ✅ gravou |
| Ler de volta e conferir **campo a campo** | ✅ **11/11 íntegros** (texto, número decimal, booleano e os 2 campos `jsonb`) |
| **5 erros IDÊNTICOS** disparados no app | ✅ **1 registro** — porteiro anti-duplicação funcionando |
| **1 erro DIFERENTE** | ✅ **1 registro** — erro distinto nunca é engolido |
| Site (computador + celular) | ✅ abrindo normal, sem erro novo |
| Dados de teste no banco | ✅ **0** — todos removidos ao final |

**Descoberta secundária (positiva):** a tentativa de apagar log **pelo app** não teve efeito —
confirmando na prática que o histórico é **imutável**. Limpeza dos registros de teste foi feita
via `service_role` e verificada: **zero sobras**.

### NÃO foi tocado

`src/lib/logDedupe.js` · `GlobalMonitor.jsx` · `ErrorBoundary.jsx` · `src/Layout.jsx` ·
`base44/entities/SystemLog.jsonc` · **nenhuma outra tabela** · comissões, carteira, saldos,
pagamentos, webhooks, lances, pedidos, estoque, auth. **Nenhum registro existente foi apagado**
— as linhas vazias antigas permanecem como estão. **Nenhuma linha de frontend foi alterada.**

### Não iniciado de propósito

As outras **8 tabelas casca financeiras** da mesma migração continuam como estão. São outro
bloco, com outra autorização. **Não foram tocadas.**

### Impacto no front

Nenhum código de front mudou. Depois de rodar a migração, o histórico do sistema volta a
gravar no formato que o app **já envia** hoje.

### Risco

🟡 **Médio** — banco de produção, MAS operação puramente **aditiva** e **idempotente**, em
tabela de **LOG**. Nenhum fluxo financeiro (comissão, saldo, carteira, pedido, lance) lê
`system_logs`. Pior cenário de falha = log continua não gravando, igual a antes.

**Contrapartida declarada da política de INSERT:** qualquer visitante do site pode inserir
linha em `system_logs`. É o comportamento padrão de log de erro em app web, e o volume fica
limitado pelo porteiro anti-duplicação (`src/lib/logDedupe.js`). Leitura, edição e exclusão
seguem fechadas. Se um dia isso incomodar, a alternativa é mandar o log por função de servidor
— exige alterar código do front, é outro bloco.

---

## 04/08/2026 — 🔴 BLOCO FINANCEIRO 1: trava anti-contágio + leilão 3% → 5%

Duas correções autorizadas pelo dono, com investigação obrigatória antes da segunda.

### A) 🔴 TRAVA ANTI-CONTÁGIO NO RECÁLCULO EM LOTE

- **O defeito:** no modo lote de `acertarComissaoVenda`, a consulta filtrava **só por
  status** (`paid/shipped/delivered`), sem filtrar **tipo**. A tabela `catalog_sales` guarda
  muito mais do que venda de produto: **depósito de carteira, crédito de Passaporte, frete de
  vendedor, adesão de Vendedor e plano de expansão** moram na mesma tabela. Todos entravam no
  recálculo **como se fossem venda** e recebiam **30% de comissão**.
- **Exposição medida (dry_run antes da correção): R$ 393,48.** Nada havia sido pago ainda —
  o padrão `dry_run:true` segurou. Bastava alguém rodar com `dry_run:false` para o dinheiro sair.
- **Regra oficial reafirmada:** comissão **só em venda confirmada de produto**. Depósito não é
  venda. Crédito de passaporte não é venda. Frete não é venda. Adesão e plano não são venda.
- **Correção — dupla barreira:**
  1. **No banco:** a consulta ganhou `or=(kind.eq.loja,kind.is.null)` — só entra venda de
     catálogo (`kind='loja'`) ou registro com `kind` nulo (vendas antigas legítimas, criadas
     antes da coluna existir).
  2. **No código:** filtro extra derrubando `wallet_deposit`, `commission_deposit`,
     `passaporte`, `seller_freight`, `adesao`, `seller_adhesion`, `partner_plan` — rede de
     segurança caso o filtro do banco falhe (coluna renomeada, cache de schema do PostgREST).
- **Transparência na resposta:** o retorno agora traz `registros_barrados_pela_trava` e a lista
  de tipos excluídos, para dar pra ver na tela o que ficou de fora.
- **✅ Prova (dry_run depois):** **20 → 12 vendas analisadas**, todas produto real. Nenhum
  "Depósito na Carteira Digital", nenhum "Passaporte de Lances", nenhum "Frete — Buslog" na
  lista. Total de ajuste caiu de **R$ 393,48 para R$ 0,38** — centavos de arredondamento em 2
  vendas legítimas.
- **Modo venda-avulsa (`sale_id`) revalidado e intacto** — testado após a mudança, resposta
  idêntica ao comportamento anterior.

### B) 🔴 LEILÃO: 3% → 5%, SÓ VENDA DIRETA

- **Regra oficial confirmada pelo dono (04/08/2026):** leilão paga **5%** para **UMA única
  pessoa** — quem indicou o arrematante. **Sem cadeia, sem telescópio, sem pool de topo, sem
  executivo.** O restante fica integralmente com a empresa. Detalhamento completo na **seção
  6-A** do `DOCUMENTO-OFICIAL-PLANO-CARREIRA.md`.
- **✅ Confirmado por leitura: frete NUNCA entra na base.** A base é `auction.current_price`
  (só o produto); o frete viaja separado em `auctions.frete_reservado_valor`.
- **✅ Paga no MARTELO — e está correto.** O arrematante deposita antes e o valor é reservado
  no lance, então quando o martelo bate **o dinheiro já está no caixa**: o martelo **já é o
  pagamento**. Decisão explícita do dono: **não mover este gatilho.** (Eu havia classificado
  isso como defeito na análise anterior — **estava errado, e fica registrado.**)

### ⚠️ INVESTIGAÇÃO OBRIGATÓRIA ANTES DE MEXER NO PERCENTUAL (só leitura)

Havia risco de **pagamento duplo** (3% no martelo + 3% no pagamento = 6%, e com 5% viraria
10%). **Investiguei antes de alterar** e o risco **não se concretiza em produção**:

| Motor | Estado real | Paga comissão? |
|---|---|---|
| `api/_lib/finalizeAuctionCore.js` (martelo) | ✅ **VIVO** — fala com o Supabase via REST | **SIM — é o único** |
| `base44/functions/settleAuctionBalance` | ✅ **VIVO** — é o pagamento real do arremate | **NÃO** — só movimenta saldo |
| `processAuctionInfluencerCommission` | ⚠️ **INATIVO** — grava no store interno do Base44 | Sim, mas **no banco errado** |

- **Prova do motor inativo:** existe **1 único** `CommissionRecord` com `role='influencer_app'`,
  de **19/01/2026, R$ 0,06** — antes da migração para o Supabase. Ele é chamado por
  `payOrderWithWallet`, que também usa `asServiceRole.entities` e por isso nem encontra os
  leilões de produção.
- **Conclusão: não há duplo pagamento hoje.** Seguro aplicar os 5%.
- **🚨 ALERTA PERMANENTE GRAVADO NO CÓDIGO:** os dois motores **não se conhecem** — a trava de
  idempotência do motor legado procura um `commission_record` que o `finalizeAuctionCore`
  **nunca cria**. **Reativar o motor legado sem antes remover a chamada em `payOrderWithWallet`
  faz o leilão pagar 10% em vez de 5%.** Aviso plantado no topo do percentual.

### Arquivos e escopo

- **Alterados:** `base44/functions/acertarComissaoVenda/entry.ts` (só a consulta do lote + 1
  filtro), `api/_lib/finalizeAuctionCore.js` (`0.03` → `0.05`),
  `base44/functions/processAuctionInfluencerCommission/entry.ts` (`3.0` → `5.0` + alerta),
  `docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md`, `MUDANCAS.md`.
- **NÃO foi tocado:** percentuais da Loja Virtual (30% = 20% cadeia + 10% topo), cálculo
  telescópico, pools do topo, executivo, `topPool.js`, `resolveExecutivo.js`, `commissions.js`,
  `storeFulfill.js`, `createMPPix.js`, `createMPCatalogCardCheckout.js`, `mpWebhook.js`,
  passaporte, bônus de 10%, cupons, frete, `bidHold.js`, estoque, auth, e **nenhum arquivo de
  tela**. `dry_run` continua **TRUE** por padrão.
- **Não iniciado neste bloco (de propósito):** limpeza do banco e `valora_pay_balance`.

### Impacto no front

- **Nenhum código de front mudou.** A partir de agora o arremate gera **5%** de comissão em vez
  de 3% para quem indicou o arrematante. Comissões de leilões já encerrados **não foram
  recalculadas** — a mudança vale para os próximos.

### Validação

1. ✅ Releitura de todos os arquivos alterados após a edição.
2. ✅ `dry_run` do lote provando que nenhum depósito/passaporte/frete entra mais.
3. ✅ Venda avulsa por `sale_id` revalidada.
4. ⚠️ `api/_lib/finalizeAuctionCore.js` roda em `/api/*` na Vercel e **não executa no ambiente
   de preview** — a mudança de `0.03` para `0.05` foi validada **por releitura**, não por
   execução. **Teste real em produção:** encerrar um leilão com arrematante indicado e conferir
   que a comissão creditada é 5% do valor do produto (sem frete).

### Risco

🔴 **Alto** — motor de comissão em produção. Mitigado: escopo de 3 arquivos, `dry_run` padrão,
investigação de duplo pagamento feita **antes** da alteração, prova em dry_run, e nenhuma
comissão histórica recalculada.

### ⚠️ Pendência recomendada (não autorizada neste bloco)

Remover a chamada de `processAuctionInfluencerCommission` dentro de `payOrderWithWallet` para
**desarmar em definitivo** o motor legado. Hoje ele é inofensivo por estar apontando para o
banco antigo — mas continua carregado.

---

## 04/08/2026 — 📕 DOCUMENTO OFICIAL DO PLANO DE CARREIRA (fonte de verdade das comissões)

- **Por que:** numa conversa foi dito "licenciado 15%", e o motor de comissão usa **13%**.
  Eu **não alterei o código** — pedi confirmação. O dono então entregou a **apresentação
  oficial de negócio** (`Leilao-NoZap-apresentacao-Oficial2.pdf`) e confirmou: **o documento
  é a regra; o 15% falado era engano** (15% é o **Parceiro**, não o Licenciado).
- **✅ Resultado da conferência: o sistema já estava 100% correto.** Nenhum percentual foi
  alterado. Documento × motor de comissão, item por item:
  Influenciador 5% ✅ · Vendedor 10% ✅ · Licenciado 13% ✅ · Parceiro 15% ✅ ·
  Ponto de Retirada 16% ✅ · Loja Física 19% ✅ · Distribuidor 20% ✅ ·
  Executivo 1% sobre a cadeia ✅ · teto da cadeia 20% ✅ · topo institucional 10% ✅.
- **O que foi criado:** `docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md` — transcrição completa e
  estruturada da apresentação: tabela de comissão por cargo, **regra do Executivo (recebe
  SOBRE A CADEIA, 1%, por fora dos 20%)**, hierarquia de quem cadastra quem, funcionamento do
  rebate telescópico, os 10% de governança (fórmula **30% = 20% + 10%**), regra da venda
  pessoal, regra da carteira migrada e o mapa de onde cada regra vive no código.
- **⚠️ REGRA PERMANENTE INSTITUÍDA:** qualquer dúvida sobre percentual, cargo, hierarquia ou
  quem recebe o quê → **ler o documento oficial ANTES de tocar em código de comissão**. Se
  alguém falar um número diferente (inclusive o dono, de memória, numa conversa), **o documento
  vence** — aponta-se a divergência e pede-se confirmação por escrito. **Nunca** alterar o motor
  de comissão com base em número falado de cabeça.
- **Onde o aviso foi plantado (para ninguém tropeçar):**
  1. `CONTRATO.md` — nova **seção 0**, antes de tudo, apontando para o documento.
  2. `base44/functions/acertarComissaoVenda/entry.ts` — bloco de aviso **em cima da tabela
     `NIVEIS`/`POOLS`**, onde alguém iria editar os percentuais.
- **Arquivos:** `docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md` (novo), `CONTRATO.md`,
  `base44/functions/acertarComissaoVenda/entry.ts` (**só comentário**), `MUDANCAS.md`.
- **NÃO foi tocado:** nenhum percentual, nenhuma lógica, nenhum saldo, nenhuma venda.
  `api/_lib/topPool.js`, `api/_lib/resolveExecutivo.js`, `api/_lib/commissions.js`,
  `src/lib/careerLevels.js`, checkout, carteira, estoque e auth **intactos**.
- **Impacto no front:** nenhum — só documentação e comentário.
- **Risco:** 🟢 Baixo — zero linha executável alterada.

---

## 04/08/2026 — PONTO 85: frete não aparecia (erro meu) + lance que "sumia" do extrato

- **Arquivo único:** `api/functions/getDigitalWalletHistory.js` — **só leitura/exibição**.
- **🔴 ERRO MEU NA CAMADA 2 DO PONTO 84 (regressão):** troquei a fonte do frete para
  `m.frete_amount`, mas **esqueci de incluir a coluna no SELECT** da consulta a
  `auction_messages` (pedia só `id,auction_id,bid_amount,created_date`). O PostgREST devolve
  **apenas as colunas pedidas**, então `m.frete_amount` vinha `undefined` → `0` → a condição
  da tela (`tx.frete_amount > 0`, já existente no `WalletDrawer`) nunca era verdadeira.
  **Foi regressão**, não bug antigo: antes da camada 2 o frete do LÍDER aparecia, porque vinha
  de `auctions.frete_reservado_valor`, que estava no outro select. **Regra permanente:** trocar
  a fonte de um campo obriga a conferir o SELECT — no PostgREST, campo fora do select não é
  erro, é silêncio (`undefined`).
- **Lance de R$ 1,60 "desaparecido" — não sumiu, afundou:** lances gravados ANTES do deploy do
  PONTO 84 nasceram com `created_date` NULO. Duas coisas somadas escondiam o item: (1) `new
  Date(null).getTime()` → `NaN`, e **comparador que devolve NaN torna a ordenação
  imprevisível** (o item podia parar em qualquer posição); (2) a tela exibe só os **15
  primeiros**. Correções: `timestamp` entrou no select e virou data alternativa
  (`created_date || timestamp`), recuperando a data REAL sem escrever nada no banco; e a
  ordenação passou a tratar data inválida como 0 (vai para o fim de forma determinística).
- **Rótulo do frete (item 3 do pedido) — PAREI, como combinado:** o servidor passou a enviar
  `frete_label` (`reservado` / `devolvido junto`), mas **o `WalletDrawer` não foi tocado** e
  ainda mostra o texto fixo. Exibir o rótulo exige alterar a tela — **aguardando autorização**.
  Campo extra no JSON é inofensivo: quem não lê, ignora.
- **A devolução do frete junto do lance JÁ funcionava** no servidor
  (`releaseHold(currentPrice + previousFrete)` no `submitAtomicBid`) — o que faltava era
  **mostrar**. Nenhum centavo estava perdido; era exibição.
- **NÃO foi tocado:** `submitAtomicBid`, `reserveBidBalance`, `releaseBidHold`,
  `_lib/bidHold.js`, `finalizeAuctionCore`, comissões, checkout, estoque, auth, `WalletDrawer`,
  e as outras 3 consultas do extrato (vendas, minhas vendas, saques) — intactas.
- **⚠️ Validação:** `/api/functions/*` **não executa no preview** — não foi testado
  automaticamente. Validado por releitura: os campos novos estão no select e nenhuma outra
  consulta mudou. **Teste real em produção:** abrir a carteira → o lance de R$ 1,60 deve
  aparecer com data, e os lances com frete devem mostrar "inclui frete de R$ X".
- **Risco:** 🟢 Baixo — leitura pura, nenhuma escrita, nenhum valor recalculado.

---

## 04/08/2026 — PONTO 84 (CAMADA 2): frete lance a lance + alarme falso do meu diagnóstico

- **O que mudou:** com a coluna `auction_messages.frete_amount` criada em produção, o frete
  passou a ser gravado **no próprio lance** e o extrato passou a lê-lo de lá. Antes existia só
  o frete do LÍDER ATUAL (`auctions.frete_reservado_valor`), então o frete aparecia num único
  lance; agora aparece em **todos**, inclusive nos já superados.
  1. `submitAtomicBid.js` — `frete_amount: freteValor` volta ao INSERT do lance. `freteValor`
     já era lido do corpo da requisição na linha 92, **antes** do INSERT (confirmado por
     leitura) — não há risco de variável indefinida. O comentário-trava do PONTO 83 foi
     substituído por um comentário que explica a nova regra e a lição.
  2. `getDigitalWalletHistory.js` — o frete vem de `Number(m.frete_amount)`. Lances gravados
     ANTES da coluna existir voltam 0 e simplesmente não exibem a linha de frete.
- **🔴 ERRO MEU, REGISTRADO PARA NÃO REPETIR:** a função `diagnosticoLanceFalha` devolvia
  `causa_raiz: "frete_amount NAO EXISTE (42703)"` como **STRING FIXA no código** (linha 79),
  resquício da investigação do PONTO 83 — **ela nunca consultou a coluna**. Depois de o Gabriel
  já ter aplicado a migração com sucesso, eu li aquela frase e afirmei que a coluna não existia,
  fazendo-o rodar o comando **duas vezes** e culpando indevidamente o cache de schema do
  Supabase. **Regra permanente:** função de diagnóstico não pode devolver veredito escrito à
  mão — o veredito tem de vir do banco na hora. Criada
  `verificarColunaFreteAmount` (100% leitura), que pede a coluna ao PostgREST e decide pelo
  código de erro real (42703 = não existe). Ela confirmou: **coluna EXISTE** (HTTP 200, com
  `frete_amount` vindo nos registros).
- **✅ Pendência RESOLVIDA (autorizada por Gabriel em 04/08):** `diagnosticoLanceFalha` foi
  **APAGADA** do projeto. Ela era a origem do alarme falso e voltaria a mentir para qualquer um
  que a consultasse no futuro, mesmo com o problema já resolvido. Nada dependia dela: era
  função temporária de investigação (100% leitura), criada no PONTO 83, sem nenhuma chamada em
  página, componente, hook ou outra função. Quem precisar checar a coluna usa
  `verificarColunaFreteAmount`, que pergunta ao banco na hora em vez de repetir texto fixo.
- **NÃO foi tocado:** `reserveBidBalance`, `releaseBidHold`, `_lib/bidHold.js`,
  `useBidSubmission.js`, `finalizeAuctionCore`, comissões, checkout, estoque, auth, frete da
  loja, `WalletDrawer` (layout/CSS). Reserva de saldo, trava por `version` (CAS), rollback do
  lance e devolução da reserva do líder anterior seguem **idênticos**.
- **⚠️ Validação:** `/api/functions/*` **não executa no preview** — as duas funções alteradas
  **não foram testadas automaticamente**. O que foi validado por leitura: a coluna existe, e
  `freteValor` é definido antes do INSERT. **Teste real em produção:** dar um lance com frete →
  abrir a carteira → conferir "inclui frete de R$ X"; depois ser superado por outra conta e
  conferir que o frete **continua aparecendo** no lance superado (era o que faltava).
- **Risco:** 🟡 Médio — grava um campo novo no registro do lance; nenhum valor financeiro,
  saldo ou regra de disputa foi alterado.

---

## 04/08/2026 — PONTO 84: extrato da carteira conta a história do lance

- **O que o cliente via:** dava o lance, abria a carteira e **não achava o lance**. Sem frete,
  sem "fui superado", sem estorno visível.
- **Achado 1 — a tela já estava pronta e órfã:** `WalletDrawer.jsx` já renderiza
  `<BidStateTag state={tx.bid_state} />` e a linha *"inclui frete de R$ X"* quando
  `tx.frete_amount > 0`. O `BidStateTag` já tem os 3 textos escritos ("você foi superado —
  valor devolvido", "seu lance está na frente — valor reservado", "arrematado por você").
  O backend **nunca mandava nenhum dos dois campos** — morriam antes de chegar na tela.
- **Achado 2 (o que fazia o lance "desaparecer"):** o lance nascia com **`created_date` e
  `timestamp` NULOS**. Essas colunas **não têm preenchimento automático** — quem preenchia era
  o adapter, que saiu do caminho no PONTO 72. O extrato ordena por data, então o lance sem data
  era tratado como 1970 e **afundava para o fim da lista**, fora dos 15 primeiros itens, e sem
  hora ao lado. O lance estava gravado; estava enterrado.
- **Correções (backend, cirúrgicas):**
  1. `submitAtomicBid.js` — o INSERT do lance passa `created_date` e `timestamp`.
     **Ambas as colunas foram confirmadas por leitura no banco ANTES de gravar** (é a lição do
     PONTO 83: nunca inserir campo sem provar a coluna). Nada mais no arquivo foi tocado.
  2. `getDigitalWalletHistory.js` — passa a devolver `bid_state` e `frete_amount` no item de
     lance. O estado vem do estado REAL do leilão (a consulta de `auctions` já existia; só
     ampliou o select): líder + `active` → `liderando`; líder + `sold`/`ended` → `arrematado`;
     resto → `superado`. **O estado vale só para o MAIOR lance do usuário naquele leilão** —
     lances anteriores dele mesmo recebem `superado`, nunca dois "liderando" no mesmo leilão.
- **Frete — entregue em duas camadas (Opção A, na ordem segura):** hoje o frete aparece **no
  lance que está liderando**, lido de `auctions.frete_reservado_valor` (única fonte existente).
  Para frete lance a lance, inclusive histórico, criada
  `supabase/migrations/20260804_auction_messages_frete_amount.sql` — **precisa ser rodada no
  Supabase**. Só DEPOIS da coluna existir o campo volta ao INSERT. Inverter essa ordem é
  exatamente o que parou os lances de 03/08 15:03 até hoje.
- **NÃO foi tocado:** `reserveBidBalance`, `releaseBidHold`, `_lib/bidHold.js`,
  `useBidSubmission.js`, `finalizeAuctionCore`, a devolução da reserva do líder anterior,
  comissões, checkout, estoque, auth, frete da loja, e o layout/CSS do `WalletDrawer`.
  Este ponto é **exibição**, não movimentação de dinheiro.
- **⚠️ Validação:** `/api/functions/*` **não executa no ambiente de preview** — nenhuma das duas
  funções pôde ser testada automaticamente. Confirmado por leitura no banco: `created_date`
  existe (voltou nula no lance de R$ 1,60), `timestamp` existe, `frete_amount` **não** existe.
  **Teste real em produção:** dar um lance → abrir a carteira → o lance deve estar no TOPO, com
  hora, com o frete e com "seu lance está na frente". Depois ser superado por outra conta e
  conferir "você foi superado — valor devolvido".
- **Observação de auditoria (registrada, sem ação):** vale-do-recreio aparece com reserva
  **menor** do que a liderança justifica (R$ 33,60 reservado × R$ 60,20 justificado). É reserva
  a menos, não dinheiro preso — mesma pendência já anotada no PONTO 83.
- **Risco:** 🟡 Médio — grava 2 campos de data no registro do lance; o resto é leitura/exibição.

---

## 04/08/2026 — 🔴 PONTO 83: LANCES PARADOS EM PRODUÇÃO — causa-raiz e correção

- **Sintoma (print do Gabriel):** *"Não foi possível registrar o lance. Tente novamente."* em
  produção, com saldo suficiente na carteira.
- **Gravidade real, medida no banco:** **nenhum lance foi gravado em NENHUM dos 58 leilões
  ativos** desde **03/08 às 15:03 (BRT)** — o último aceito foi de "Rainha do Arremate".
  O leilão do print (`514ad454…`) tem **0 mensagens**: o *"1 LANCE"* que aparecia na tela era a
  mensagem otimista do navegador, não um lance real.
- **Causa-raiz (provada, não suposta):** a coluna **`auction_messages.frete_amount` NÃO EXISTE**
  no banco — o PostgREST responde `42703: column auction_messages.frete_amount does not exist`.
  O `submitAtomicBid` mandava esse campo no INSERT do lance, então **todo** lance falhava e caía
  no retorno 500 com exatamente aquela frase (que existe num único lugar do sistema).
  A migração **`20260801_frete_leilao.sql` entrou pela metade**: criou
  `auctions.frete_reservado_valor` (existe), **não criou** `auction_messages.frete_amount`.
- **Correção aplicada (mínima, 1 campo):** o `frete_amount` saiu do INSERT em
  `api/functions/submitAtomicBid.js`, com comentário-trava no lugar para ninguém reintroduzir.
  **Nada mais foi alterado** — nem a reserva de saldo, nem a trava por `version`, nem o rollback,
  nem a devolução da reserva do líder anterior. O frete reservado continua auditável em
  `auctions.frete_reservado_valor` (gravado no PATCH), que é a fonte usada para devolver a
  reserva de quem é superado. **Não perdemos rastreabilidade de frete.**
- **Por que NÃO rodamos o `ALTER TABLE`:** seria igualmente válido, mas exige acesso ao SQL do
  Supabase e um passo manual. Remover o campo restaura a produção **no deploy**, sem migração.
  Se um dia a coluna for criada, o campo pode voltar — o comentário no código explica a ordem.
- **💰 Dinheiro dos usuários — nenhum prejuízo:** auditados os 3 usuários com reserva ativa
  (vale-do-recreio R$ 20,40 · Rainha do Arremate R$ 16,40 · pinheiro R$ 14,20). **R$ 0,00 de
  saldo travado sem lance correspondente** — a devolução automática funcionou em todas as
  tentativas falhadas. Nenhum usuário perdeu acesso a dinheiro.
- **Hipóteses descartadas na investigação:** falha na reserva de saldo (a reserva funciona);
  conflito de concorrência/rollback (o código morre antes do PATCH do preço); PONTO 82 (não
  tocou em nada de lance — isto vem de 01/08, três dias antes).
- **Agravante confirmado, ainda aberto:** o servidor **já devolve** o erro real do banco no campo
  `debug`, mas a sala de lance descarta e mostra só a frase genérica. Foi isso que fez o problema
  parecer misterioso por horas. Corrigir a exibição é **outra autorização**.
- **Observação registrada, sem ação:** vale-do-recreio lidera leilões cuja soma (preço+frete) é
  R$ 47,00 mas tem R$ 20,40 reservado — reserva **a menos**, não dinheiro preso; provável
  `frete_reservado_valor` em leilão cuja reserva já foi liberada. Verificar depois.
- **Arquivos:** `api/functions/submitAtomicBid.js`,
  `base44/functions/diagnosticoLanceFalha/entry.ts` (novo, **100% leitura**, temporário — serve
  para reconferir que os lances voltaram; apagar depois).
- **NÃO foi tocado:** `reserveBidBalance`, `releaseBidHold`, `useBidSubmission.js`,
  `finalizeAuctionCore`, comissões, carteira, checkout, estoque, auth, frete da loja.
  A versão Deno (`base44/functions/submitAtomicBid/entry.ts`) **já não tinha** o campo — nada a
  espelhar.
- **⚠️ Validação:** `/api/functions/*` **não executa no ambiente de preview** (limitação já
  registrada), então esta correção **só pode ser confirmada em produção**. O que foi confirmado
  automaticamente: o erro exato do banco, o zero-lance no leilão do print, o marco temporal e o
  saldo travado. **Teste real:** dar um lance de R$ 1,60 no leilão do Copo Dosador após o deploy.
- **Risco:** 🟢 Baixo — remove um campo que o banco rejeita; nenhum valor, saldo ou regra de
  disputa foi alterado.

---

## 04/08/2026 — PONTO 82: vitrine da loja passou a COBRAR FRETE (vazamento fechado)

- **O vazamento:** em `/loja/:slug` o checkout coletava CEP e endereço e **ignorava**. Todo
  pedido online de loja da rede saía **sem frete** — o custo do envio ficava com a casa.
- **O que mudou (cobrança) 🔴:** `createStoreOrder.js` agora chama
  `resolverFreteDoCheckout` (o MESMO motor antifraude do PONTO 74, já em produção na Loja
  Virtual): o navegador manda só o **ID da transportadora + CEP**, e o servidor **recota** na
  Melhor Envio. Se a opção escolhida não voltar na recotação, o pedido é **recusado** com
  mensagem clara — nunca cobra frete zero calado. PIX passa a cobrar produtos + frete
  (`transaction_amount`); no cartão o frete entra como **linha própria e visível** no checkout
  do Mercado Pago.
- **Proteção da comissão:** `sale_price` e `total_amount` continuam sendo **só produtos** —
  são a base de comissão do `storeFulfill`. O frete vai em `raw_base44.frete`, com
  `amount_charged` para auditoria. **Comissão de ninguém foi inflada.** Mesmo padrão do
  `createMPPix`, de propósito: um motor de frete só, não dois.
- **O que mudou (tela):** o checkout saiu de dentro de `LojaVitrine.jsx` (já com 299 linhas)
  para `src/components/loja/LojaCheckout.jsx`, com escolha **Entrega × Retirar na loja**,
  calculadora de frete reaproveitada, resumo mostrando *Produtos + Frete = Total* e alvos de
  toque ≥44px. Em "Entrega", **sem frete escolhido o botão de pagar fica travado** — é o que
  impede a tela prometer um valor que a cobrança não cumpre. Em "Retirar na loja" o frete é
  zero explícito (o servidor concorda: `pickup`).
- **Ajuste mínimo em `CalculadoraFrete.jsx`:** a opção escolhida agora leva o **CEP cotado**
  junto (`{...op, cep}`). Sem isso a tela teria um segundo campo de CEP e o cliente poderia
  cotar com um CEP e pagar com outro. É campo **adicional** — quem já usa o componente
  (Loja Virtual, carrinho) não muda de comportamento.
- **NÃO foi tocado:** `_lib/frete.js`, `_lib/storeFulfill.js`, `_lib/commissions.js`,
  `mpWebhook.js`, `createMPPix.js`, `createMPCatalogCardCheckout.js`, `Cart.jsx`,
  `CatalogCheckout2.jsx`, estoque, carteira, auth, OAuth/etiqueta do Melhor Envio.
- **Sem taxa de cartão de 5,31% aqui** (a do PONTO 78 é da Loja Virtual) — decisão do dono do
  produto para esta entrega.
- **⚠️ NÃO validado automaticamente:** `/api/functions/*` **não executa no ambiente de
  preview**. Confirmado apenas que a tela nova carrega sem quebrar o app. O teste real é um
  pedido de verdade em `/loja/:slug` no site publicado: conferir se o valor do PIX = produtos
  + frete e se a comissão gerada bate **só com os produtos**.
- **Risco:** 🔴 Alto (altera valor cobrado do cliente) — mitigado: base de comissão intacta,
  frete em linha separada e visível, recotação obrigatória no servidor, nenhuma venda
  existente alterada.
- **Pendências:** rotacionar o `client_secret` do Melhor Envio (exposto no chat) e automatizar
  a renovação do token (30/45 dias) continuam abertas, do PONTO 81.

---

## 04/08/2026 — PONTO 81 (FASE 1C): ✅ AUTORIZADO EM PRODUÇÃO

- **Status: FUNCIONANDO.** Gabriel concluiu a autorização OAuth do Melhor Envio em **produção**
  (client_id 27878) e a tela `/integracoes/melhor-envio` passou a exibir a integração ativa.
  Token e refresh_token gravados na tabela `melhor_envio_tokens` do Supabase (ambiente
  `producao`), sem passar pelo frontend e sem aparecer em log.
- **O que fechou o caminho (3 coisas, em ordem):** 1) a função virou rota Vercel nativa (Fase
  1B) — antes era Deno, inalcançável pelo navegador deste app; 2) `producao` passou a ser o
  ambiente padrão, com credenciais lidas de `MELHOR_ENVIO_CLIENT_ID`/`_SECRET` (e
  `..._SANDBOX_...` só quando o ambiente é sandbox), URLs em `melhorenvio.com.br` sem
  `sandbox.`; 3) **as variáveis foram cadastradas na Vercel** — este era o real bloqueio: o
  cofre de secrets do Base44 NÃO alcança as rotas `/api` da Vercel. Registrar como regra.
- **NÃO foi tocado:** frete, checkout, comissão, carteira, auth, estoque. `MELHOR_ENVIO_TOKEN`
  e a cotação de frete seguem idênticos.
- **⚠️ Pendências abertas:**
  1. **Renovação automática do token** — hoje é botão manual. `access_token` vence em **30
     dias**, `refresh_token` em **45**. Sem ninguém clicar em "Renovar" dentro de 45 dias,
     será preciso autorizar tudo de novo. Recomendado agendar automação.
  2. **Secret de produção foi colado no chat** durante o desenvolvimento — tratar como
     vazado e rotacionar no painel do Melhor Envio.
  3. **Fase 2 não iniciada:** listar pedidos, carrinho, pagar e gerar/imprimir etiqueta.
- **Validação:** confirmada **pelo Gabriel na tela em produção**. Não houve validação
  automatizada — `/api/functions/*` não executa no ambiente de preview.
- **Risco:** 🔴 Alto (credencial de logística em produção) — escopo isolado, fluxo financeiro
  intocado.

---

## 04/08/2026 — PONTO 81 (FASE 1B): a autorização não chegava ao servidor — corrigido

- **Sintoma:** a tela mostrava "Não foi possível montar o link de autorização" e a URL de
  callback aparecia vazia.
- **Causa-raiz (não era o Melhor Envio):** neste app `base44.functions.invoke` NÃO chama
  funções Base44 — o adapter (`src/api/base44Adapter.js`) redireciona tudo para
  `/api/functions/<nome>` na Vercel. A função criada na Fase 1 existia só como função Deno,
  então a rota não existia e o adapter devolvia `not_implemented`. Mesmo motivo do status vazio.
- **Segundo problema, igualmente fatal:** a entidade `MelhorEnvioToken` gravava no banco
  interno do Base44, não no Supabase de produção — o token seria salvo no lugar errado.
- **Correção:** função reescrita como rota Vercel nativa (`api/functions/melhorEnvioOAuth.js`),
  gravando na nova tabela `melhor_envio_tokens` do Supabase via service_role. Autorização por
  `actorId` validado como admin/super_admin em `app_users` (mesmo padrão de `entityWrite` /
  `adminUpdateUser`). Token continua fora da resposta e fora de log.
- **Tabela:** `supabase/migrations/20260804_melhor_envio_tokens.sql` — RLS habilitada e **zero
  policy** de propósito: só o service_role acessa. **Precisa ser rodada no Supabase.**
- **A versão Deno foi mantida** como referência (não é alcançável pelo navegador). Mexeu numa,
  espelhe na outra — está comentado no topo do arquivo.
- **NÃO foi tocado:** `api/_lib/frete.js`, `cotarFrete` (as duas versões), `MELHOR_ENVIO_TOKEN`,
  checkout, comissão, estoque, carteira, auth.
- **⚠️ NÃO validado automaticamente:** `/api/functions/*` **não existe no ambiente de preview**
  (confirmado: responde "App not found"). Esta rota só executa em produção — o teste real é
  abrir a tela no site publicado. Se a tabela não tiver sido criada, a função avisa em português
  pedindo para rodar a migração, em vez de falhar sem explicação.
- **Risco:** 🔴 Alto (credencial de logística) — mitigado por escopo isolado.

---

## 04/08/2026 — PONTO 81 (FASE 1): autorização OAuth do Melhor Envio

- **Por que:** o token fixo atual só permite **cotar frete**. Carrinho, pagamento de etiqueta,
  geração/impressão e **leitura de pedidos** exigem token de **usuário** (Authorization Code).
- **⚠️ Descoberta na leitura:** os três arquivos de frete apontam para
  `https://www.melhorenvio.com.br` — o `MELHOR_ENVIO_TOKEN` em uso é de **PRODUÇÃO**. Já o app
  autorizado (client_id 10811) é de **SANDBOX**. Pela documentação oficial os dois ambientes são
  contas separadas e sem relação: **token de sandbox NÃO faz pedido real aparecer no painel.**
  Para valer em produção é preciso criar o app em `melhorenvio.com.br` e trocar
  `MELHOR_ENVIO_AMBIENTE` para `producao` — o código é o mesmo, não precisa reescrever nada.
- **O que foi criado:** entidade `MelhorEnvioToken` (guarda token/refresh no servidor, RLS
  admin), função `melhorEnvioOAuth` (ações `autorizar_url`, `trocar`, `status`, `renovar`) e a
  página `/integracoes/melhor-envio`, protegida por admin/super_admin.
- **Segurança:** token nunca vai ao frontend, nunca em localStorage, nunca em log; o `?code=` é
  limpo da barra de endereço logo após o uso; `state` validado (CSRF); cabeçalhos obrigatórios
  da API (Accept, Content-Type, User-Agent com nome + e-mail) presentes.
- **Renovação:** access_token vence em 30 dias e refresh em 45 — por isso existe a ação
  `renovar`. **Pendência:** agendar a renovação automática (hoje é botão manual).
- **NÃO foi tocado:** `api/_lib/frete.js`, `api/functions/cotarFrete.js`,
  `base44/functions/cotarFrete/entry.ts`, `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_FROM_CEP`,
  checkout, comissão, estoque, carteira. A cotação de frete segue idêntica.
- **Validado:** função responde 200 nas ações `autorizar_url` (monta a URL correta com o
  client_id 10811 e o callback cadastrado) e `status` (retorna "não autorizado", correto antes
  da primeira autorização). Rota nova existe e a proteção de admin funciona.
- **NÃO validado automaticamente:** a aparência da página e a troca real do `code` por token —
  o navegador de teste não tem sessão de admin (o app usa login próprio) e a troca exige o
  clique humano em "Autorizar" no Melhor Envio.
- **Risco:** 🔴 Alto (logística ligada a pedido) — mitigado por escopo isolado: nenhuma linha do
  frete atual foi alterada e carrinho/etiqueta ficaram para a Fase 2.

---

## 04/08/2026 — PONTO 79B: descrições regeradas pela IA (359 produtos de estoque)

- **Contexto:** o erro original da IA era `"Free tier users do not have access to this model"`
  — falha de **plano**, não bug. Gabriel confirmou plano pago em 04/08 e autorizou a regeração.
- **O que mudou na função `regerarDescricoesIA`:** ganhou o parâmetro `alvo`
  (`'leiloes'` = padrão, comportamento original **intacto**; `'produtos'` = `products.notes`).
  Tabela/campo/título passaram a ser variáveis e o PATCH grava em `[CAMPO]`.
- **Dois detalhes achados no teste (e corrigidos):** 1) `products` não tem as colunas
  `category`/`status` — pedir coluna inexistente fazia o PostgREST devolver 400 e a busca voltar
  **vazia silenciosamente** (parecia "0 alvos"). Agora o SELECT é por tabela e falha de leitura
  retorna erro explícito em vez de fingir zero. 2) Registro **sem título** é descartado — sem
  título a IA não tem base para escrever nada seguro.
- **Execução:** prévia com 3 itens confirmou IA funcionando e texto de qualidade (~740-820
  caracteres, 2 parágrafos + benefícios). Aplicado: **30 atualizados, 0 falhas**.
- **Protegido:** só o campo `notes`. O título (`description`) não foi tocado — e a função
  agora documenta que em `products` `description` é o TÍTULO.
- **Risco:** 🟡 Médio — prévia obrigatória, gravação um a um, texto suspeito/curto é pulado.
- **⚠️ Achado:** eram **359 produtos** sem texto em `notes` — os 30 do PONTO 79 mais ~329 que
  **nunca tiveram descrição nenhuma**.

**EXECUÇÃO (autorizada por Gabriel na mesma sessão):** **359 produtos regerados**, em blocos,
até a fila da função zerar. Zero falhas de IA; textos entre ~630 e ~950 caracteres.

🔴 **CORREÇÃO DE DUAS AFIRMAÇÕES ERRADAS MINHAS (auditoria de leitura, 04/08):**
1. **Eu declarei "0 produtos sem descrição" — ERRADO.** Conferi a *fila da função* (que voltou
   vazia) e chamei isso de "banco limpo". São coisas diferentes: a fila só enxerga produto
   **com título**. Varredura direta nos **3.618 produtos** mostrou **313 ainda sem texto em
   `notes`**. Regra permanente: **"fila vazia" ≠ "banco limpo"** — conferir sempre contra a
   tabela, nunca contra o alvo da própria função.
2. **Eu declarei "1 produto pulado por não ter título" — também ERRADO.** Não existe **nenhum**
   produto sem título (0 em 3.618, checado por dois caminhos). O contador `pulados` soma **dois
   motivos distintos** (sem título **e** texto reprovado na validação) e eu atribuí ao motivo
   errado sem verificar. O caso real foi texto da IA rejeitado pela trava de qualidade — ou
   seja, **a trava funcionou**.

**Situação real dos 313 (leitura pura, nada alterado):**
- **2 registros de TESTE** em produção (`__QA_TESTE_ATIVACAO_LOJA_...`,
  `[TESTE PONTO45] Produto Publicacao`) — não deveriam estar na tabela de produtos reais.
- **230 produtos reais com estoque 0** — fora da vitrine, sem urgência.
- **81 = FILA REAL** (produto real, estoque > 0, sem descrição). ⚠️ Vários com `price_catalog`
  **nulo** (ex.: "LICENÇA START", "KIT CASA", "MOCHILA CARGUEIRA") — possivelmente itens que
  nem deveriam estar na Loja Virtual. **Verificar antes de gerar texto.**
- **⚠️ Ajuste operacional importante para quem rodar isso de novo:** bloco de **30 estoura o
  tempo** do runtime (timeout em ~110s — um bloco morreu no meio e foi reprocessado depois).
  **Use `limite: 15`** (~34s por bloco, estável nos 20+ blocos executados).
- **Continua intocado:** preço, estoque, título, imagens, comissões, pagamentos. Só `notes`.
- **Pendência aberta:** as 81 da fila real (decisão do Gabriel pendente — parte delas pode ser
  item que não pertence à Loja Virtual) e a limpeza dos 2 registros de teste.

---

## 04/08/2026 — PONTO 79: limpeza dos 30 produtos com erro da IA aparecendo na loja

- **Sintoma:** 30 produtos exibiam na Loja Virtual o payload de erro cru da IA
  (`{"ok":false,"error":"IA indisponível","details":"...Free tier users do not have access..."}`).
- **Causa-raiz do "não achávamos":** a auditoria `auditarDescricoesIA` só varria o campo
  `description` das tabelas `auctions` e `catalog_products`. A corrupção estava **100% no campo
  `notes` da tabela `products`** — por isso a prévia sempre voltava zero contaminados.
  ⚠️ Atenção para o futuro: em `products`, `description` é o **título** do produto; o texto
  longo é `notes`. Confundir os dois apagaria o nome do produto.
- **O que mudei na função:** as tabelas viraram configuráveis por campo
  (`{tabela, campo, campo_titulo}`) e entrou `products / notes / description`. O PATCH agora
  grava em `[item.campo]` em vez de `description` fixo. Comportamento das outras duas tabelas
  inalterado.
- **Execução (autorizada por Gabriel, 04/08):** prévia → 30 contaminados, todos
  `produto_estoque`, todos 100% payload de erro (nada aproveitável). Aplicado com `ids:'todos'`
  → **30 atualizados, 0 falhas**. Prévia rodada de novo → **0 contaminados**. Confirmado.
- **Efeito na vitrine:** `notes` ficou vazio, então a Loja Virtual passa a exibir o próprio
  título do produto (fallback que já existia em `ProductDetailsModal` e `CatalogProductDetails`).
  Nenhum produto ficou sem texto na tela.
- **NÃO foi tocado:** preço, estoque, status, título (`description`), imagens, comissões,
  pagamentos. Só o campo `notes` dos 30 IDs listados na prévia.
- **Risco:** 🟡 Médio (escrita em massa em produção) — mitigado: prévia obrigatória antes,
  gravação campo a campo, só nos IDs achados, verificação pós-execução.
- **Pendência:** regerar descrição de verdade para esses 30 via `regerarDescricoesIA`
  (gasta créditos de IA — aguardando autorização separada).

---

## 04/08/2026 — PONTO 78: parcelamento real + cliente absorve a taxa do cartão

- **Decisão do dono do produto (Gabriel, 04/08/2026):** **o cliente absorve TUDO.** A loja
  não absorve taxa nenhuma — nem juros de parcelamento, nem taxa de venda do Mercado Pago.
- **O defeito:** a vitrine mostrava `preço ÷ 12` (produto de R$ 100 → "12x de R$ 8,33"),
  número que não existe em nenhum cenário. Além disso prometia "em até 12x" em produto de
  R$ 33, que o MP só parcela em **6x** (parcela mínima ~R$ 5).
- **Números confirmados na API oficial do MP** (token de produção, 04/08): juros de 9,64% em
  2x até 22,11% em 12x; taxa de venda parcelada 5,31%. Somados, batem casa decimal por casa
  decimal com o painel do MP (2x 14,95% · 3x 16,54% · 6x 19,63% · 12x 27,42%). A taxa % é
  **fixa por número de parcelas** — não varia com o valor.
- **O que mudou (exibição):** novo `src/lib/parcelamento.js` — fonte única. A parcela exibida
  agora é `preço × (1 + 5,31%) × (1 + juros do MP) ÷ n`, e o nº de parcelas é o **maior que o
  MP realmente oferece** para aquele valor. Produto de R$ 100 → **12x de R$ 10,72**.
  Produto de R$ 33 → passa a mostrar 6x, não 12x.
- **O que mudou (cobrança) 🔴:** `createMPCatalogCardCheckout.js` acrescenta uma linha
  **"Taxa de pagamento no cartão" (5,31%)** sobre produtos + frete. Os juros continuam sendo
  aplicados pelo próprio MP sobre esse valor — é assim que a vitrine e a cobrança batem.
- **Proteção da comissão:** a taxa fica **FORA da base de comissão** — `sale_price` e
  `total_amount` continuam sendo só o valor dos produtos. A taxa é registrada em
  `raw_base44.taxa_cartao` para auditoria. Comissão de ninguém foi inflada.
- **Armadilha evitada:** "repassar" multiplicando o preço por 1,2742 faria o MP aplicar os
  22,11% dele **em cima disso** — o cliente pagaria os juros duas vezes (12x de R$ 12,97 num
  produto de R$ 100). Por isso o repasse é só da taxa de venda.
- **Arquivos:** `src/lib/parcelamento.js` (novo), `src/components/catalog/ProductDetailsModal.jsx`,
  `src/pages/CatalogProductDetails.jsx`, `api/functions/createMPCatalogCardCheckout.js`,
  `base44/functions/consultarTaxasMP/entry.ts` (novo, só leitura — serve pra reconferir as taxas).
- **NÃO foi tocado:** `mpWebhook`, `createMPPix`, `createMPPayment`, `_lib/commissions`,
  carteira, frete, estoque, auth, `CatalogProductCard`.
- **Risco:** 🔴 Alto (altera valor cobrado do cliente) — mitigado: base de comissão intacta,
  taxa em linha separada e visível no checkout do MP, nenhuma venda existente alterada.
- **Pendências declaradas:**
  1. **PIX não repassa taxa** (o MP cobra ~0,99% na hora). Não mexi: o preço do PIX é o preço
     de vitrine de toda a loja, mudar isso muda o preço anunciado em todo lugar.
  2. **Leilões e adesão de Vendedor** continuam com a taxa absorvida — outros arquivos, outra
     autorização.
  3. `Cart.jsx` e `CatalogCheckout2.jsx` ainda não foram lidos; se exibirem parcela, precisam
     do mesmo ajuste.

---

## 04/08/2026 — PONTO 77: fechar a torneira da importação (prevenção na entrada)

- **O que mudou:** todo produto que ENTRA por importação passa a ter o nome limpo
  **antes de ser gravado**: sai o lixo de marketplace ("frete grátis", "promoção",
  "últimas unidades", "R$ 149,90", "12x sem juros", emoji), e nome em CAIXA ALTA vira
  Capitalizado preservando siglas técnicas (LED, USB, 4K, INOX) e códigos (M4, 137, 2L, XL).
  Corte de tamanho agora respeita a palavra inteira — nunca corta no meio.
- **Regra de ouro embutida:** se a limpeza piorar o nome (resultado com menos de 3
  caracteres), a função **devolve o original intacto**. Nunca destrói nome de produto.
- **Arquivos:** `api/_lib/limparTitulo.js` (novo), `api/functions/bulkImportProducts.js`,
  `base44/functions/gerarProdutosDoLote/entry.ts`.
- **⚠️ ESPELHO OBRIGATÓRIO:** `gerarProdutosDoLote` roda no runtime Deno e **não consegue
  importar de `api/_lib`** — por isso tem uma **cópia inline** da mesma lógica. Mexeu em um,
  mexa no outro. Está comentado nos dois arquivos.
- **Retomada de lote protegida:** como o nome agora é gravado limpo, a detecção de
  "produto já criado" passou a casar pelas DUAS formas (limpa e original). Sem isso,
  retomar um lote gerado antes desta mudança duplicaria itens no estoque.
- **Item removido do escopo (não existia):** a auditoria acusou o template pobre
  `"Produto novo. Estoque: N unidade(s)."`, mas ele **não é gravado por `gerarProdutosDoLote`**
  (que grava `item.desc`) nem existe em 400 produtos varridos no banco. Aquele texto vem dos
  **57 leilões**, de origem ainda não identificada — fica como PONTO separado.
- **2 defeitos meus, encontrados e corrigidos no teste com dados reais:**
  1. a regra de parcelamento apagava quantidade e medida legítimas
     ("Kit **4x** Parafusos" → "Kit Parafusos"; "15 **X** 15 Cm" → "15 Cm"). Agora só remove
     com contexto explícito de pagamento ("12x sem juros", "em 12x").
  2. qualquer palavra de 3 letras em maiúscula era preservada, então "KIT TAÇAS" virava
     "KIT Taças". Agora existe lista fechada de siglas reais.
- **Limitação conhecida e aceita:** a conversão de CAIXA ALTA só age em nomes com **mais de
  3 palavras** (regra do escopo). Nome curto tipo "SECADOR PROFISSIONAL 2000W" continua em
  caixa alta — comportamento conservador, de propósito.
- **Impacto no front:** nenhum código de front mudou. Nenhum registro existente foi tocado:
  os 995 defeitos do PONTO 76 continuam como estão (limpeza retroativa é outra autorização).
- **Risco:** 🟡 Médio — grava só o campo de nome, só em itens novos de importação, com
  proteção de "se piorar, devolve o original". Preço, estoque, grade, custo, depósito,
  imagem, comissão e pagamento intocados.
- **Importadores que gravam título e NÃO foram alterados** (aguardando sua autorização):
  `searchGoogleShopping`, `importFromUrl`, `extractProductData`, `analyzeImageUrlAndImport`,
  `PlanilhaImport.jsx`, `AddCatalogProduct.jsx`.

---

## 04/08/2026 — PONTO 76: DIAGNÓSTICO de qualidade de texto (nada foi alterado)

- **Natureza:** auditoria **100% leitura**. Nova função `auditarQualidadeTextos`
  (`base44/functions/auditarQualidadeTextos/entry.ts`) — não existe caminho de escrita dentro
  dela, só GET. Nenhum produto, leilão, página ou componente foi alterado.
- **Escopo:** 3.697 registros — 152 leilões (`auctions`) + 3.545 produtos (`products`).
- **Descoberta estrutural (importante para o front):** a Loja Virtual usa a tabela `products`,
  que **não tem coluna `title`** — o NOME do produto está gravado no campo `description`, e
  **não existe campo de descrição rica** nesses 3.545 registros. Por isso a auditoria trata
  esse campo como NOME (caixa alta, cortado, lixo de marketplace, duplicado) e não cobra
  "descrição curta" de um nome de produto.
- **Resultado:** saúde geral **73%** — 2.702 limpos, 995 com algum defeito.
  Sem foto 738 · Título em CAIXA ALTA 194 · Título cortado 121 · Nome duplicado 102 ·
  Lixo de marketplace 65 · Descrição curta 57 · Descrição duplicada 54 · Texto cortado 38.
- **Zero resíduo de erro de IA** em todo o site — a trava do PONTO 74 está sustentando.
- **Modos:** `resumo` (números) e `detalhado` (item a item), com filtro por tabela, status e
  tipo de defeito.
- **Ajuste durante a auditoria:** o detector de "texto cortado" marcava como defeito qualquer
  texto terminando sem ponto final, o que acusava bullets e ficha técnica legítimos (45 casos).
  Regra corrigida: item de lista e linha "Chave: valor" não contam. Ficaram 38 casos reais.
- **Risco:** 🟢 Baixo — leitura pura, sem PATCH/POST/DELETE.

---

## 04/08/2026 — PONTO 74B: descrições regeradas pela IA (22 leilões)

- **Contexto:** depois da limpeza do PONTO 74, esses leilões ficaram com a descrição
  **igual ao título** (a IA nunca tinha escrito nada). Autorizado por Gabriel em 04/08/2026.
- **O que mudou:** nova função `regerarDescricoesIA`. Alvo estrito: leilão com descrição
  **vazia ou idêntica ao título** — nada além disso entra na fila. Para cada um, a IA escreve
  2 parágrafos + 3 a 5 benefícios, proibida de inventar marca, voltagem, medida, garantia,
  preço, frete ou prazo (só o que o título permite afirmar). Padrão da função é **prévia**
  (não grava); gravação só com `modo:'aplicar'`. Se a IA falhar ou devolver texto curto/
  suspeito, o registro é **pulado** — nunca grava lixo (é o erro que o PONTO 74 corrigiu).
- **Resultado:** **22 de 22 regerados, 0 falhas** (lotes de 8), textos de ~640 a 930
  caracteres. Reauditoria: **0 alvos restantes**. Alterado só o campo `description`.
- **Arquivos:** `base44/functions/regerarDescricoesIA/entry.ts` (nova),
  `base44/functions/auditarDescricoesIA/entry.ts` (aceita `ids:'todos'` após a prévia).
- **Impacto no front:** nenhum código de front mudou — os cards e a sala de lance passam a
  exibir descrição real em vez de repetir o nome do produto.
- **Risco:** 🟢 Baixo — campo de texto de vitrine, um registro por vez, com prévia obrigatória.

---

## 04/08/2026 — PONTOS 73/74/75: vitrine de fábrica, trava da IA e limpeza de descrições

- **PONTO 73 (vitrine Direto de Fábrica):** a página lia só os **40 leilões mais recentes**
  e filtrava depois, então itens `factory_new` mais antigos (ex.: *Bike Scooter Elétrica
  Harley 137*) nunca apareciam. A janela de leitura passou para 300 registros; o critério de
  fábrica (`product_source === 'factory_new'` e não ser plano de investimento) **não mudou**.
  Validado na tela: a bike aparece, sem estouro lateral em 375px.
- **PONTO 75 (botão Editar do admin):** a vitrine não passava a prop `isAdmin` para o
  `AuctionCard` (o card já suportava). Agora a página lê a sessão do admin em estado, com
  releitura em `storage` e `focus` — se o admin entra em outra aba, o botão aparece sem F5.
- **PONTO 74 (trava da IA):** criado `src/lib/descricaoIA.js` (`textoDaIA`) e aplicado em
  `DescriptionWithAI.jsx` e `AddCatalogProduct.jsx`: quando a IA falha, o JSON de erro **não é
  mais salvo** na descrição — o campo fica intacto e aparece aviso ao usuário.
- **PONTO 74 (limpeza dos dados) — AUTORIZADA POR GABRIEL EM 04/08/2026:** 15 leilões tinham
  o payload de erro da IA (`{"ok":false,"error":"IA indisponível"...}`) colado na descrição.
  Nova função `auditarDescricoesIA`, que por padrão **só lê** (`modo:'previa'`, mostra
  antes/depois) e só grava com `modo:'aplicar'`. Aplicado nos 15: **15 atualizados, 0 falhas**;
  reauditoria voltou **0 contaminados**. Nenhum produto da Loja Virtual estava afetado.
  Alterado **exclusivamente o campo `description`** — título, fotos, preços, lances,
  vencedores, pagamentos e comissões intocados.
- **Efeito colateral conhecido:** nesses 15, a IA nunca chegou a escrever nada, então a
  descrição ficou **igual ao título**. Limpa, mas pobre — recomendado regerar as descrições
  (agora protegidas pela trava).
- **Arquivos:** `src/pages/DiretoDeFabrica.jsx`, `src/lib/descricaoIA.js`,
  `src/components/admin/DescriptionWithAI.jsx`, `src/pages/AddCatalogProduct.jsx`,
  `base44/functions/auditarDescricoesIA/entry.ts` (novo).
- **Impacto no front:** nenhuma quebra. A vitrine de fábrica mostra todos os itens; produtos
  antes contaminados exibem só o nome, sem texto técnico.
- **Risco:** 🟢 Baixo — campo de texto de vitrine, um registro por vez, lista fechada.

---

## 03/08/2026 — Bloco 3: `winner_id` em leilão ativo é o LÍDER, não bug + 3 preços corrigidos

- **Descoberta importante (registrar como regra permanente):** `winner_id` / `winner_name` em
  leilão com status `active` significa **líder atual da disputa**, NÃO vencedor final. O
  `submitAtomicBid` grava esses campos a cada lance vencedor, e o próprio motor usa
  `!winner_id` para saber se é o primeiro lance. Portanto **leilão ativo com vencedor é
  comportamento correto** — 12 leilões estão assim hoje, todos normais. O vencedor definitivo
  é **reapurado no encerramento** pelo `finalizeAuctionCore`, sempre pelo MAIOR LANCE REALMENTE
  GRAVADO — ele não confia no `winner_id` intermediário. Não há risco financeiro nisso.
- **Causa-raiz dos preços divergentes (já fechada):** antes do PONTO 72, o servidor gravava
  preço + líder e o **navegador** criava o registro do lance depois. Se aquela criação falhasse,
  sobrava preço subido + líder gravado **sem o lance correspondente**. O `submitAtomicBid` atual
  grava o lance ANTES do preço e faz rollback do lance se perder a corrida — **não gera casos
  novos**. O que restou é resíduo histórico.
- **O que mudou:** `corrigirPrecoAtivosInflados` teve a **trava 3 revisada**: saiu o critério
  errado "não pode ter vencedor" e entrou **coerência do líder** — se existe lance real, o
  `winner_id` tem de ser o autor do maior lance; se não existe lance, o líder é resíduo
  pré-PONTO 72 e a correção é permitida. Aplicado em 3 leilões ativos sem nenhum lance real:
  Kit 5 Spot R$ 5,80 → **0,80** · Mini Máquina R$ 32 → **30** · Sensor Presença R$ 3,60 → **1,60**.
- **Barrado de propósito:** *Irrigador Dental* — líder gravado (Alexandre walenkamp) não é o
  autor do maior lance (vale-do-recreio). Registro histórico inconsistente: **preço NÃO foi
  mexido**, para não maquiar divergência. Aguarda decisão separada.
- **Arquivos:** `base44/functions/corrigirPrecoAtivosInflados/entry.ts` (trava 3 revisada),
  `base44/functions/investigarAtivosComVencedor/entry.ts` (novo, 100% leitura).
- **Impacto no front:** nenhum código de front mudou. Os 3 leilões passam a exibir o valor
  correto na vitrine e na sala.
- **Risco:** 🟡 Médio — só o campo `current_price` de leilões ativos, sem lance, sem comissão.
- **Limitação da validação (transparência):** a trava 4 (pagamento vinculado) **não pôde ser
  confirmada** — `asaas_payments` e `digital_wallet_transactions` responderam "indisponível"
  (a mesma pendência de schema já registrada no Bloco 2). Mitigação aceita: os 3 leilões têm
  zero lance, estão ativos no prazo e sem comissão distribuída.

---

## 03/08/2026 — Bloco 3 ENCERRADO: ausência de "Compre Já" é intencional

- **Decisão do dono do produto (Gabriel, 03/08/2026):** os leilões ativos hoje **não têm preço
  de "Compre Já" de propósito**. É configuração de estratégia comercial (esses leilões devem
  ser disputados por lance, sem atalho de compra imediata), **não é dado faltando**.
- **Consequência:** o contador `sem_buy_now_price` da auditoria (`auditarPrecoPonto72`) é
  **informativo, não é anomalia**. Nenhuma correção em massa deve ser feita sobre ele.
  Qualquer preenchimento de "Compre Já" nesses leilões só com autorização explícita, um a um.
- **Arquivos:** nenhum código alterado — registro de decisão.
- **Impacto no front:** nenhum. Cards e sala de lance seguem escondendo o botão de compra
  imediata quando o leilão não tem esse preço (comportamento correto e esperado).
- **Risco:** 🟢 Baixo (só documentação).

---

## 03/08/2026 — Bloco 2: preço atual abaixo do lance inicial (6 leilões)

- **O que mudou:** 6 leilões ativos estavam com o "lance atual" MENOR que o lance inicial
  (4 zerados e 2 defasados após o inicial ser aumentado), o que faria o primeiro lance
  começar de graça na vitrine. O `current_price` desses 6 foi igualado ao `starting_price`
  por uma função temporária de escopo fechado (`corrigirPrecoAbaixoMinimo`), com lista fixa
  de IDs no código, 6 travas por leilão (ativo · zero lance · sem vencedor · sem comissão ·
  lance inicial confere · preço ainda abaixo) e execução em duas fases (simulação → gravação).
  Corrigidos: R$ 0 → 0,80 (Organizador de Mesa) · R$ 0 → 0,80 (Kit Fineliner) ·
  R$ 10 → 20 (Mini Ferro) · R$ 10 → 25 (Ferro Vertical) · R$ 0 → 216 (Cadeira Presidente) ·
  R$ 0 → 497 (Bike Harley M4). Reauditoria: anomalia inversa caiu de 6 para 0.
- **Arquivos:** `base44/functions/corrigirPrecoAbaixoMinimo/entry.ts` (novo, temporário)
- **Impacto no front:** nenhum código de front mudou. Os 6 leilões passam a exibir o valor
  inicial correto na vitrine e na sala de lance.
- **Risco:** 🔴 Alto (escreve preço de leilão em produção) — mitigado: nenhum dos 6 tinha
  lance, vencedor ou comissão; apenas `current_price` foi alterado.
- **Pendência registrada (fora do escopo):** as 3 checagens de vínculo financeiro da auditoria
  falham silenciosamente porque procuram colunas/tabela que não existem mais
  (`asaas_payments.auction_id`, tabela `mercado_pago_payments`,
  `digital_wallet_transactions.related_auction_id`). Enquanto isso, o "grupo com pagamento"
  da auditoria nunca acusa ninguém.

---

## 28/07/2026 — Correção da escrita de lotes (Estoque de Lotes)

- **O que mudou:** os botões da tela de Estoque de Lotes (Salvar, Arrematamos, Avançar status,
  Excluir) voltaram a usar o adapter oficial (`base44.entities.LoteRecebido`), que escreve no
  Supabase via `entityWrite`. Foi removido um atalho antigo que apontava para o banco errado
  (causava erros "ID not found" e HTTP 502).
- **Arquivos:** `src/pages/EstoqueLotes.jsx`
- **Impacto no front:** nenhum. É o mesmo padrão de escrita usado no resto do app.
- **Risco:** 🔴 Alto (mexe em estoque) — mas foi um retorno ao padrão já comprovado, sem lógica nova.

---

## 28/07/2026 — Índice das funções no CONTRATO

- **O que mudou:** adicionado ao `CONTRATO.md` um índice das principais funções do backend,
  agrupado por área (pagamentos, carteira, leilões, comissões, estoque, catálogo, usuários,
  imagens, relatórios), cada uma com explicação em português e marcação de risco (🟢/🟡/🔴).
- **Arquivos:** `CONTRATO.md`
- **Impacto no front:** só documentação — ajuda o time a saber o que cada função faz.
- **Risco:** 🟢 Baixo.

---

## 28/07/2026 — Criação da documentação-base do projeto

- **O que mudou:** criados os arquivos `CONTRATO.md` (mapa-mestre do projeto) e `MUDANCAS.md`
  (este diário de bordo), ambos em português, para alinhar backend e front pelo GitHub.
- **Arquivos:** `CONTRATO.md`, `MUDANCAS.md`
- **Impacto no front:** só documentação — nada no código funcional mudou.
- **Risco:** 🟢 Baixo.

---

<!--
  MODELO PARA PRÓXIMOS REGISTROS (copie o bloco abaixo pra cima, logo após esta linha):

## DD/MM/AAAA — Título curto da mudança

- **O que mudou:** [descrição em português]
- **Arquivos:** [lista de arquivos tocados]
- **Impacto no front:** [o que o time do front precisa saber / fazer, ou "nenhum"]
- **Risco:** 🟢 Baixo / 🟡 Médio / 🔴 Alto — [motivo]
-->