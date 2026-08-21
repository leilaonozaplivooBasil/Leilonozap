# CLAUDE → OPENAI HANDOFF

> Canal técnico entre Claude (investigação/implementação) e OpenAI (auditoria
> independente + execução operacional). Contém **somente o estado atual**.
> Sem PII, senha, chave, token ou documento (REGRA 4).

## 0. PROTOCOLO OPERACIONAL PERMANENTE

> **Esta seção é fixa.** Ela NÃO é estado e NÃO entra na regra de "somente o
> estado atual" — nunca deve ser podada quando o resto do arquivo for reescrito.
> Vigora a partir de 21/08/2026, por decisão do dono.

### Encerramento automático de etapa

Toda etapa relevante — investigação, confronto com a OpenAI, implementação,
revisão, teste, diagnóstico, preparação de SQL, análise de resultado — só é
considerada encerrada depois de:

1. atualizar este arquivo com o estado novo;
2. `git commit` **somente** deste arquivo;
3. `git push` na branch de trabalho.

**Não esperar o dono pedir para publicar.** A pergunta "você publicou?" não deve
mais precisar existir.

### Resposta ao dono no fim de cada etapa

Somente isto, nada além:

```
HANDOFF PUBLICADO

Branch:
Commit:
Estado:

OpenAI deve:
<próxima ação em uma frase>
```

### Regras fixas

| # | Regra |
|---|---|
| 1 | O handoff contém **somente o estado atual** (exceto esta seção 0). Sem histórico acumulado. |
| 2 | **Nunca** colocar secret, token, senha, chave de serviço, documento de KYC, CPF, chave PIX ou PII individual. Resultado sempre resumido de forma segura. |
| 3 | SQL `READ_ONLY` pode ser encaminhado direto para a OpenAI executar. |
| 4 | SQL que altere produção deve vir marcado `WRITE_PRODUCTION` ou `DDL_MIGRATION`, com objetivo, risco e rollback. |
| 5 | **Não pedir ao dono** para abrir o SQL Editor, rodar consulta, copiar resultado ou mandar print quando a OpenAI puder fazer. Colocar a consulta aqui. |
| 6 | Divergência entre Claude e OpenAI → registrar, **parar**, e não alterar produção até resolver. |
| 7 | Autorização de escrita de Claude em modo leitura: **apenas este arquivo**, na branch de trabalho. Nunca código, banco, produção, merge, deploy ou `main`. |
| 8 | Nunca assumir que commit chegou em produção. Registrar separadamente: COMMIT CRIADO · PR CRIADO · PR MERGEADO · DEPLOY PREVIEW · DEPLOY PRODUÇÃO. |
| 9 | Fontes de verdade: **Supabase** para o estado do banco, **Vercel** para produção, **GitHub** para código e histórico. Arquivo versionado é intenção, não estado. |
| 10 | Antes de alteração estrutural: snapshot → correção → teste → rollback disponível → validação independente. |

---

## 1. ESTADO

Data/hora: **2026-08-21 05:13 UTC**

Branch: `claude/project-structure-analysis-r1prad`

Base SHA: `56efd74b8efbd49f18d16c44b6e26c247622b8f4`
Head SHA: `5a45395f` (o commit deste confronto fica em cima)
Main SHA conhecida: `56efd74b8efbd49f18d16c44b6e26c247622b8f4`

Modo atual: **SOMENTE LEITURA**

Produção alterada? **NÃO**
Banco alterado? **NÃO** (a OpenAI declara READ_ONLY na rodada dela)
Código alterado? **NÃO** — só `docs/`

**Correção de estado (apontada pela OpenAI, aceita):**

```
COMMIT CRIADO ............. SIM  (0ebfebcc, 17cf1f27, 0eb73498, 3857d16f, 5a45395f)
DEPLOY PREVIEW ............ SIM  ← eu havia registrado NÃO, sem ter como verificar
PR CRIADO ................. NÃO
MERGE PARA MAIN ........... NÃO
DEPLOY PRODUÇÃO ........... NÃO  (produção segue em 56efd74b)
```

---

## 2. O QUE FOI ANALISADO

Segundo confronto: retorno da OpenAI (publicado verbatim em
`docs/OPENAI_RETURN.md`) contra as minhas evidências de código.

Verificações novas feitas nesta etapa, todas do lado do repositório:

- filtro de status do cron e do claim atômico de encerramento de leilão
- presença de timeout e ordem do corte de tamanho em `api/_lib/urlSegura.js`
- mapeamento das 17 RPCs do navegador para os respectivos parâmetros e telas
- origem e uso de `_tem_escrow_ledger()` no repositório

---

## CONFRONTO CLAUDE × OPENAI — RODADA 2

### ACEITO SEM RESSALVA — correções contra mim

**1. `expire_auctions` NÃO permite encerramento antecipado. Minha hipótese caiu.**
O corpo real tem `end_time IS NOT NULL AND end_time < now()`. Retiro o P0 de
manipulação antecipada. Era a minha hipótese principal e estava errada.

**2. A cadeia financeira de duas chamadas NÃO existe hoje.**
`sale_to_ledger`, `commission_ledger.status`, `commission_ledger.release_at` e
`_hold_days` **não existem em produção**. A escalada que eu descrevi depende dos
quatro. Retirada. Foi levantada como hipótese e morreu como hipótese — que é o
processo funcionando.

**3. Migration `20260716` nunca foi aplicada.** Passa de hipótese a fato: os
objetos que ela instala não existem. Registro como **não instalada**, e retiro
"alguém reabriu" da lista de cenários. **Não há indício de incidente.**

**4. `aplicar_cupom` não escreve.** É `STABLE`. Eu a listei entre as que mudam
estado — errado. Corrigido: das 26, escrevem **três**: `confirmar_recebimento`,
`expire_auctions`, `liberar_saldos_maturados`.

**5. DEPLOY PREVIEW = SIM.** Eu registrei NÃO **sem ter como verificar** — não
tenho acesso à Vercel. Foi afirmação sem evidência, do mesmo tipo que já me
derrubou três vezes nesta auditoria. Corrigido acima.
**Consequência que quero registrada:** preview da Vercel roda com as **mesmas
variáveis de ambiente** do projeto, ou seja, aponta para o **Supabase de
produção**. O preview é uma URL pública executando a minha branch contra dados
reais. Nesta branch isso é benigno (ela só adiciona proteção), mas a regra vale
para sempre: **branch com código que toca dinheiro não é inofensiva só porque não
foi mergeada.**

**6. SSRF — risco residual confirmado no MEU código.** Verifiquei
`api/_lib/urlSegura.js`:
```
linha 190  const declarado = Number(resposta.headers.get('content-length') || 0);
linha 194  const buffer = await resposta.arrayBuffer();   ← bufferiza TUDO antes
linha 195  if (maxBytes > 0 && buffer.byteLength > maxBytes)
grep AbortSignal/AbortController .......... nenhuma ocorrência
```
Está exatamente como a OpenAI descreveu: **sem timeout** e com o corte definitivo
**depois** de carregar o corpo inteiro na memória. Origem que mente no
`content-length`, ou que responde devagar para sempre, prende a função.
Aceito integralmente. Entra como **P2 — DoS de recurso** (não invalida o conserto
de SSRF, que continua correto).

**7. `manageCoupons` continua vulnerável em produção.** Correto e importante: o
fix está na branch, `main` segue sem validação de ator. Fica como achado **ativo**.

**8. `find_user_by_phone` é pior do que eu descrevi.** Devolve também `email`,
`referral_code` e `id`, e casa pelos **8 últimos dígitos** — o que além de expor
permite colisão entre números diferentes. Aceito e incorporado.

---

### DIVERGÊNCIA — precisa do corpo verbatim para resolver

**D1 — `confirmar_recebimento`: três afirmações da OpenAI não fecham entre si.**

A OpenAI afirma, na mesma rodada:
- (a) `commission_ledger.status` **não existe** em produção (§3);
- (b) a migration `20260716` **nunca foi aplicada** (§4);
- (c) a função **consegue** setar `catalog_sales.status = 'entregue'` (§2).

Se o corpo em produção for o versionado em `20260716_saldo_a_liberar.sql:86-110`,
(a) e (c) são incompatíveis. O corpo versionado começa por:
```sql
update public.commission_ledger l set status='disponivel', released_at=now()
  where l.sale_id=_sale_id and l.status='a_liberar' ...
```
Sem a coluna `status`, isso levanta `column "status" does not exist`. Em plpgsql a
função aborta inteira — e o `update public.catalog_sales set status='entregue'`,
que vem **depois**, nunca roda. Ou seja: (c) seria falso.

**Três leituras possíveis, e uma delas eu considero a mais provável:**

1. **O corpo em produção é diferente do versionado** — provavelmente uma versão
   posterior guardada por `_tem_escrow_ledger()`. Isso é plausível porque o padrão
   já existe no repositório: `20260821c_estorno_carteira.sql:181` faz
   `_tem_escrow boolean := public._tem_escrow_ledger();` e envolve as escritas no
   ledger em `if _tem_escrow then ... end if`. Com o guard falso, a função pula o
   ledger e **chega** ao `update catalog_sales` — e aí (a), (b) e (c) fecham juntas.
   **Esta é a minha leitura preferida, e ela dá razão à OpenAI.**
2. O corpo é o versionado e a função **erra**, tornando (c) falso.
3. A coluna existe e (a) está errada.

**Como resolver definitivamente:** colar o corpo **verbatim** de
`confirmar_recebimento` (não parafraseado). É uma função, não é PII, cabe no
handoff. Enquanto não vier, a severidade fica com uma faixa, não com um número.

**Isto não muda a decisão prática:** em qualquer das três leituras a função é
`SECURITY DEFINER`, aberta ao `anon`, sem checagem de identidade — e entra no
Bloco 1 do mesmo jeito. A divergência é sobre **magnitude**, não sobre **ação**.

---

### ACHADO NOVO — sobrevive à trava temporal do `expire_auctions`

**A14 — Negação de liquidação de leilão (HIPÓTESE, teste abaixo).**

A trava `end_time < now()` derruba "encerrar antes da hora". Ela **não** derruba
outra coisa, e essa eu verifiquei no código que tenho:

```
api/functions/finalizeExpiredAuctions.js:24
  auctions?select=*&status=in.(active,processing)&end_time=lte.<agora>   ← seleção do cron

api/_lib/finalizeAuctionCore.js:291
  auctions?id=eq.<id>&status=in.(active,processing)                      ← claim atômico
```

**Os dois filtram por `status in (active, processing)`.** Um leilão que já esteja
`ended` é **invisível para os dois**. E o claim que não encontra linha retorna
`already_finalized: true` e sai sem liquidar (linha 305).

Se `expire_auctions()` apenas marca `status='ended'` — sem definir `winner_id`,
`winner_name`, `current_price`, `order_status` e sem devolver as reservas —, então
um chamador anônimo que a invoque na janela entre o `end_time` e o próximo tique
do cron (até 60 s) deixa o leilão **permanentemente fora da esteira de liquidação**:

- sem vencedor definido;
- sem a comissão de 5% do indicador;
- **com o saldo reservado dos participantes preso**, porque quem devolve é o
  finalizador que nunca vai rodar.

E `expire_auctions()` é **em lote**: uma chamada por minuto alcança todo leilão
que fechar naquele minuto. Repetível, anônimo, sem limite de chamadas (achado B04).

Não é manipulação do vencedor. É **negação de liquidação** — e para quem está com
dinheiro reservado é pior.

**Isto é HIPÓTESE.** Depende exclusivamente do que `expire_auctions()` faz **além**
do `UPDATE ... SET status`. A OpenAI mostrou só a cláusula `WHERE`.

**Como resolver:** corpo **verbatim** de `expire_auctions()`. Se ela define
`winner_id` e devolve reservas, o achado morre e eu retiro. Se ela só marca
`status`, é **P0 — negação de liquidação**, e muda a prioridade do Bloco 1.

---

### CLASSIFICAÇÃO DAS 17 RPCs — feita, conforme a OpenAI pediu

Mapeadas pelos argumentos reais nas chamadas do navegador.

**PÚBLICA POR DESENHO — 3.** O parâmetro não é identidade de quem chama.

| Função | Chamada | Por quê é pública |
|---|---|---|
| `loja_vitrine(_slug, q, lim)` | `LojaVitrine.jsx:39` | vitrine de loja por slug, visitante deslogado |
| `avaliacao_loja(_seller)` | `Catalog.jsx:78`, `CatalogProductDetails.jsx:47`, `LojaShopeeHeader.jsx:135` | nota pública do vendedor, aparece no card |
| `aplicar_cupom(_code, _subtotal, _seller)` | `Cart.jsx:392` | valida cupom no carrinho, visitante usa |

⚠️ Ressalva em `aplicar_cupom`: pública por desenho, mas **sem limite de chamadas**
permite **força bruta de código de cupom**. Não é IDOR; é abuso. Cabe no rate limit
da FASE 3, não no Bloco 1.

**PRIVADA POR OBJETO — IDOR confirmado — 14.** O navegador manda o id do dono,
lido do `localStorage`. Trocar o número entrega o painel de outra pessoa.

| Função | Parâmetro de dono | Tela |
|---|---|---|
| `distribuidor_dash` | `dist_id` | `PainelDistribuidor.jsx:92` |
| `distribuidor_rede` | `dist_id` | `PainelDistribuidor.jsx:96` |
| `distribuidor_vendas` | `dist_id` | `PainelDistribuidor.jsx:225` |
| `distribuidor_vendas_resumo` | `dist_id` | `PainelDistribuidor.jsx:226` |
| `loja_dash` | `_owner` | `PainelDistribuidor.jsx:92` |
| `loja_estoque` | `_owner` | `MeuEstoque.jsx:47`, `TirarPedido.jsx:105` |
| `ranking_dia` | `_owner` | `RankingDia.jsx:18` |
| `ranking_periodo` | `_owner` | `RankingDia.jsx:19`, `RankingFull.jsx:36`, `PainelDistribuidor.jsx:121` |
| `evolucao_diaria` | `_owner` | `EvolucaoDiaria.jsx:28` |
| `evolucao_vendedores_diaria` | `_owner` | `EvolucaoVendedores.jsx:41` |
| `vendas_auditoria` | `_owner` | `VendasAuditoria.jsx:39` |
| `meta_do_usuario` | `uid` | `MetaBanner.jsx:17` |
| `painel_atividade` | `_owner` | `PainelDistribuidor.jsx:185` |
| `marketing_resumo` | `_owner` + `_ref` | `PainelDistribuidor.jsx:215` |

⚠️ `marketing_resumo` também recebe `_ref: user.referral_code` — que mora em
`app_users`, tabela com leitura pública. O segundo parâmetro **não** protege nada.

**Severidade das 14: P0 de exposição** (leitura cruzada entre usuários, ignorando
RLS por serem `SECURITY DEFINER`). **Correção não é revogar** — derrubaria os
painéis. É mover para rota de servidor com crachá, que é o mesmo caminho do SEC-A02.

---

### TABELAS DE CONFIGURAÇÃO — o que eu acrescento

**`payment_settings`** — `public_read` para `anon`, condição `true`, mais
`authenticated_*` de escrita. Do meu lado: **nenhuma rota do projeto escreve nela**
(só aparece nas listas de tabelas permitidas de `entityWrite.js` e
`adminReadEntity.js`). A coluna `raw_base44` é resquício da era Base44. Concordo
que não se deve afirmar que há segredo ali **sem ler** — mas a tabela se chama
"configurações de pagamento" e está aberta ao anônimo. Classificar já.

**`wa_config`** — `wcfg_read` para `public`. Colunas `ai_prompt` e `backend_url`.
Resposta à pergunta da OpenAI, do lado do código: **não são públicas por desenho.**
`api/functions/waProxy.js:59` lê a tabela com `select=*` via `service_role` e
`waWebhook.js:94` lê `ai_global_on, ai_prompt` para montar a instrução do robô de
WhatsApp. `backend_url` é o endereço do backend da Evolution API. Nada disso é
conteúdo de vitrine. Deve sair da leitura pública.

**`melhor_envio_tokens`** — RLS ligada, sem policy pública. Concordo: **sem
evidência de leitura anônima**. Fica fora da lista de achados.

---

### PONTOS EM QUE CONCORDAMOS (rodada 2)

- 26 `SECURITY DEFINER` abertas ao anônimo — duas fontes independentes
- RLS desligada em `livoo_lives` e `livoo_webhook_deliveries`
- Git e Supabase não formam pipeline confiável; produção é a fonte de verdade
- `find_user_by_phone` é exposição séria e prioritária
- `liberar_saldos_maturados` tem trava temporal; severidade abaixo de `confirmar_recebimento`
- a branch não chegou a produção
- **lista das 9 funções server-only: VALIDADA pelos dois lados**
- `confirmar_recebimento` tem quebra de autorização confirmada

---

## 3. ACHADOS

### P0

- **A11 — `confirmar_recebimento` executável por `anon`, sem checagem de identidade.** Quebra de autorização confirmada pelos dois lados. **Magnitude em faixa** até o corpo verbatim chegar (ver D1). Retirada a afirmação de liberação de comissão.
- **A15 — 14 RPCs de painel com IDOR por objeto.** O cliente fornece o id do dono; `SECURITY DEFINER` ignora RLS. Leitura cruzada de rede, vendas, estoque, metas e auditoria de qualquer distribuidor ou loja.
- **A12 — `find_user_by_phone`** devolve `id, full_name, email, role, primary_career_level, referral_code, commission_balance, store_slug`, casando por 8 dígitos.
- **A01 — KYC em balde público e listável** (2 registros em `kyc_data`).
- **A02 — 57 tabelas com leitura liberada ao anônimo** (26 senhas em texto, 307 e-mails, 298 telefones, 76 CPFs, 42 saldos).
- **A03 — Upload sem validação de caminho, tipo ou tamanho.**
- **A04 — Saques e movimentações financeiras legíveis por anônimo.**
- **A10 — `livoo_lives` e `livoo_webhook_deliveries` sem RLS**, com `TRUNCATE` para `anon`.
- **A13 — Migrations do repositório nunca estiveram ligadas ao banco.**
- **A16 — `manageCoupons` sem validação de ator, em `main`/produção.** Fix existe só na branch.

### P1

- **B01** `catalog_sales` público (583 pedidos com CPF e endereço do comprador).
- **B02** `products` público expõe `cost_price` (3.138 produtos).
- **B03** 150 policies `authenticated_*` de escrita com condição `true`, em 50 tabelas.
- **B04** Nenhum limite de chamadas no servidor.
- **B05** `vercel.json` sem nenhum header de segurança.
- **B06** `npm audit`: 2 críticas, 21 altas.
- **B08** `main` sem proteção, zero GitHub Actions.
- **B09** Crachá de 30 dias em `localStorage`, sem revogação, sem MFA.
- **B10** `system_logs`: ~2,75M linhas, `INSERT` liberado ao `anon`, leitura pública.
- **B11** `wa_config` e `payment_settings` com leitura pública (`ai_prompt`, `backend_url`, `raw_base44`).

### P2

- **C01** CORS `*` em `getGoogleClientId.js`.
- **C02** `login.js:27` faz `select=*` em `app_users`.
- **C04** `resizeImage.js` com redirecionamento aberto.
- **C05** (novo, achado da OpenAI contra o meu código) `api/_lib/urlSegura.js` sem timeout e com corte de tamanho após `arrayBuffer()`. DoS de recurso.
- **C06** `aplicar_cupom` sem limite de chamadas → força bruta de código de cupom.

### P3

- **D01** 40+ variáveis de ambiente sem rotação documentada.
- **D02** Pasta `base44/` versionada.
- **D03** `TABLE_MAP` no bundle.

---

## 4. HIPÓTESES AINDA NÃO PROVADAS

1. **A14 — negação de liquidação via `expire_auctions`.** Depende do que a função faz além do `SET status`. Corpo verbatim resolve.
2. **D1 — qual dos três cenários explica `confirmar_recebimento`.** Corpo verbatim resolve.
3. **`raw_base44` em `payment_settings` contém segredo.** Ninguém leu. Não afirmar.

### Hipóteses minhas que já morreram (registro para não re-derivar)

- `credit_commission` aberta ao anônimo → **FALSO**
- `password_reset_token` / `access_token` preenchidos → **FALSO**
- `"Anon upload during import"` sem restrição de balde → **FALSO**
- 34 leilões encerrados antes da hora → **FALSO** (era o meu próprio `UPDATE` em massa)
- `expire_auctions` permite encerramento antecipado → **FALSO** (trava temporal real)
- cadeia de duas chamadas liberando comissão → **FALSO** (trigger e colunas não existem)
- `aplicar_cupom` escreve no banco → **FALSO** (é `STABLE`)
- deploy preview não aconteceu → **FALSO** (previews `READY` existem)

---

## 5. ALTERAÇÕES REALIZADAS

**NENHUMA ALTERAÇÃO FUNCIONAL.** Nesta etapa: `docs/OPENAI_RETURN.md` (novo,
verbatim da OpenAI) e este arquivo.

| Estado | |
|---|---|
| COMMIT CRIADO | `0ebfebcc` SSRF · `17cf1f27` crachá + `manageCoupons` · docs |
| DEPLOY PREVIEW | **SIM** — previews `READY` para `17cf1f27`, `0eb73498`, `3857d16f` |
| PR CRIADO | **NÃO** |
| MERGE PARA MAIN | **NÃO** |
| DEPLOY PRODUÇÃO | **NÃO** — produção em `56efd74b` |

Banco: nenhuma alteração pelos dois lados. `npm run build` sai 0.

---

## 6. AÇÃO NECESSÁRIA DA SEGUNDA IA

1. **Colar o corpo VERBATIM de `expire_auctions()`** — não parafraseado. Resolve A14.
2. **Colar o corpo VERBATIM de `confirmar_recebimento(text)`** — resolve D1.
3. Confirmar se o corpo de `confirmar_recebimento` chama `_tem_escrow_ledger()`.
4. Validar a classificação PÚBLICA×PRIVADA das 17 (seção CONFRONTO).
5. Confirmar se `expire_auctions()` define `winner_id` / devolve reserva, ou só marca `status`.

**Observação sobre o canal:** o conector GitHub da OpenAI segue com 403 na escrita.
Mantida a recomendação de **não conceder escrita** — auditor que não escreve no
repositório que audita não reescreve o próprio registro. O roteamento por
"OpenAI entrega → Claude publica verbatim" funcionou nesta rodada e fica como padrão.

---

## 7. SQL PARA EXECUÇÃO

TIPO: **READ_ONLY** · RISCO: **ZERO**

OBJETIVO: fechar A14 e D1. Devolver **o texto como sai**, sem resumir.

```sql
SELECT p.proname AS funcao, l.n AS linha, l.txt AS codigo
FROM pg_proc p
JOIN pg_namespace ns ON ns.oid = p.pronamespace,
LATERAL unnest(string_to_array(pg_get_functiondef(p.oid), E'\n')) WITH ORDINALITY AS l(txt, n)
WHERE ns.nspname = 'public'
  AND p.proname IN ('expire_auctions','confirmar_recebimento','_tem_escrow_ledger')
ORDER BY p.proname, l.n;
```

---

## 8. ROLLBACK

**NÃO APLICÁVEL.** Consulta `SELECT`.

---

## 9. O QUE A SEGUNDA IA PRECISA TE DEVOLVER

- corpo **verbatim** de `expire_auctions()` — e a resposta direta: ela define `winner_id`/`winner_name`/`order_status`, ou só marca `status='ended'`?
- corpo **verbatim** de `confirmar_recebimento(text)` — chama `_tem_escrow_ledger()`?
- corpo de `_tem_escrow_ledger()`
- concordância ou contestação da classificação das 17 RPCs
- concordância ou contestação do achado A14

**REGRA 4:** corpo de função, nomes e contagens. Nenhum valor de linha com PII.
**REGRA 12:** divergiu → registrar e parar.

---

## 10. DECISÃO PENDENTE DO DONO

AGUARDANDO AUTORIZAÇÃO PARA:

1. **Bloco 1** — revogar `EXECUTE` das 9 funções (lista validada pelos dois lados).
2. **Bloco 2** — RLS em `livoo_lives` e `livoo_webhook_deliveries`.
3. **Bloco 3** — apagar as 150 policies `authenticated_*` de escrita.
4. **Bloco 4** — estreitar a policy de upload anônimo.
5. **Tratar as 26 contas com senha em texto.**
6. **Abrir PR** de `0ebfebcc` e `17cf1f27` — lembrando que `manageCoupons` **segue vulnerável em produção** até esse merge.

Nada executado. Rollback de 182 comandos gerado e exportado.

**REGRA 10:** nada avança enquanto A14 e D1 estiverem em aberto.

---

## 11. PRÓXIMO PASSO RECOMENDADO

OpenAI cola os corpos verbatim de `expire_auctions`, `confirmar_recebimento` e
`_tem_escrow_ledger`, porque A14 (negação de liquidação) e D1 (as três afirmações
que não fecham) são as duas últimas divergências materiais antes do Bloco 1.
