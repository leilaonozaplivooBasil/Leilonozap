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

Data/hora: **2026-08-21 05:47 UTC** — sprint noturna autônoma concluída

Branch: `claude/project-structure-analysis-r1prad`
Base SHA: `56efd74b` · Head: `e50d5da7` (+ o commit deste handoff)
Main SHA conhecida: `56efd74b8efbd49f18d16c44b6e26c247622b8f4`

Modo: **IMPLEMENTAÇÃO EM BRANCH · PRODUÇÃO INTOCADA**

```
Produção alterada? .... NÃO
Banco alterado? ....... NÃO   (nenhum DDL/DML; nem li — não tenho acesso)
main alterada? ........ NÃO
Merge? ................ NÃO
Deploy produção? ...... NÃO
SESSAO_MODO ........... intocado
RLS ................... intocada
9 revogações .......... NÃO executadas
```

```
COMMIT CRIADO ..... SIM · 8 commits nesta sprint
DEPLOY PREVIEW .... SIM · automático da Vercel, aponta para o Supabase de produção
PR CRIADO ......... NÃO
MERGE ............. NÃO
DEPLOY PRODUÇÃO ... NÃO
```

`npm run build` exit 0 · `npm test` **61/61** · worktree limpa.

---

## 2. O QUE FOI ANALISADO

Sprint noturna, blocos A→K. Todo trabalho ficou na branch.

---

## 3. ACHADOS

Rodada 2 fechada. Os dois pendentes viraram fato com o retorno da OpenAI.

### P0

- **A14 — NEGAÇÃO DE LIQUIDAÇÃO DE LEILÃO · CONFIRMADO pelas duas IAs.**
  `expire_auctions()` marca `sold`/`ended` sem definir `winner_id`, sem
  `order_status`, sem comissão, sem devolver reserva. `finalizeExpiredAuctions.js:24`
  e `finalizeAuctionCore.js:291` filtram os dois por `status in (active,processing)`
  — leilão já marcado fica invisível para a esteira. Anônimo chamando na janela de
  até 60 s entre o `end_time` e o cron tira o leilão da liquidação para sempre:
  sem vencedor, sem comissão, **com a reserva dos participantes presa**. Em lote e
  repetível. A OpenAI confirmou que o único trigger de UPDATE em `auctions` é
  `set_updated_at` — não há liquidação escondida.
- **A11 — `confirmar_recebimento` executável por `anon`, sem checar identidade.**
  Corpo real: chama `_tem_escrow_ledger()`, e como `commission_ledger.status` não
  existe o bloco financeiro é pulado — mas a função **chega** ao
  `update catalog_sales set status='entregue'`. **A OpenAI estava certa e eu
  estava errado** na divergência D1: eu supus que a função abortaria antes.
  Magnitude final: **não libera comissão**; muda qualquer venda para `entregue`.
- **A15 — 14 RPCs de painel com IDOR por objeto.** 17/17 sem `auth.uid()`.
  Classificadas: 3 públicas por desenho, 14 privadas.
- **A12 — `find_user_by_phone`** devolve `id, full_name, email, role,
  primary_career_level, referral_code, commission_balance, store_slug`, casando
  pelos 8 últimos dígitos (permite colisão).
- **A01 — KYC em balde público e listável** (2 registros).
- **A02 — 57 tabelas com leitura liberada ao anônimo** (26 senhas em texto).
- **A03 — Upload sem validação de caminho, tipo ou tamanho.**
- **A04 — Saques e movimentações legíveis por anônimo.**
- **A10 — `livoo_lives` e `livoo_webhook_deliveries` sem RLS**, com `TRUNCATE` para `anon`.
- **A13 — `supabase/migrations/` nunca esteve ligado ao banco.**
- **A16 — `manageCoupons` sem validação de ator em `main`/produção.**

### P1
`catalog_sales` público · `products` expõe `cost_price` · 150 policies
`authenticated_*` · sem limite de chamadas no servidor · `vercel.json` sem
headers · `main` sem proteção · crachá de 30 dias sem revogação ·
`system_logs` 2,75M com insert anônimo · `wa_config`/`payment_settings` públicas.

### P2
CORS `*` em `getGoogleClientId` · `login.js` com `select=*` ·
`resizeImage` com redirecionamento aberto · `aplicar_cupom` sem limite (força
bruta de código de cupom) · lint com 71 erros.

**`urlSegura` sem timeout — CORRIGIDO nesta sprint** (era C05).

---

## 4. HIPÓTESES AINDA NÃO PROVADAS

1. **Existe `pg_cron`, webhook do Supabase ou automação externa chamando
   `expire_auctions()`?** É a **única** coisa que separa "aposentar a função" de
   ser decisão óbvia. Só a OpenAI consegue checar.
2. `raw_base44` em `payment_settings` contém segredo. Ninguém leu. Não afirmar.
3. Houve exploração real de A14 no passado. Sem evidência — e o método forense
   disponível (`updated_date`) não detecta, porque qualquer `UPDATE` posterior
   apaga o rastro.

### Hipóteses minhas que morreram (não re-derivar)
`credit_commission` aberta ao anônimo · `password_reset_token` preenchido ·
upload anônimo sem restrição de balde · 34 leilões encerrados antes da hora (era
o meu próprio `UPDATE` em massa) · `expire_auctions` sem trava temporal ·
cadeia de duas chamadas liberando comissão · `aplicar_cupom` escreve ·
deploy preview não aconteceu · `confirmar_recebimento` abortaria antes do
`update catalog_sales` (**D1 — a OpenAI estava certa**).

---

## 5. ALTERAÇÕES REALIZADAS

### Implementado e testado na branch

| Commit | O quê |
|---|---|
| `771856e1` | `urlSegura.js`: streaming com contador incremental, `AbortController`, prazo único para toda a operação, e o laço de leitura conferindo o prazo por conta própria |
| `bf4ab7a1` | 42 testes de SSRF/tamanho/tipo/tempo |
| `542e7471` | `npm test` precisa de glob, não de diretório |
| `cefbc251` | 19 testes de autorização de `manageCoupons` |
| `b6c6f5dd` | `npm audit fix` sem breaking: **32 → 11** vulnerabilidades, só lockfile |
| `f02163f1` | CI mínima: lint, build, testes. Sem segredo, sem deploy, `contents: read` |

### Preparado e NÃO aplicado

| Arquivo | O quê |
|---|---|
| `docs/remediacao_NAO_APLICADA/01..04` | revogação das 9 RPCs + diagnóstico + verificação + rollback. **Ciclo testado num PostgreSQL 16 real: 9 fechadas, servidor mantém acesso, rollback devolve** |
| `docs/PLANO_REMEDIACAO.md` | blocos E–K: arquitetura do `expire_auctions`, as 14 RPCs viradas em 4 rotas, RLS tabela a tabela, KYC em 8 passos, e a ordem de 19 itens |
| `docs/OPENAI_RETURN.md` | retorno da OpenAI, verbatim |

**Dois defeitos do meu próprio código encontrados pelos testes**, documentados nos
commits: (1) o `abort` do signal derruba o `fetch` mas não garante que a leitura
do corpo morra — com um dublê que não derruba o corpo, a função pendurava; agora
cada `read()` corre contra o relógio. (2) `npm test` com diretório em vez de glob.

---

## 6. AÇÃO NECESSÁRIA DA SEGUNDA IA

1. **Auditar os 6 commits de código** — principalmente `771856e1` (o streaming) e
   os testes. Procurar o que eu não testei.
2. **Responder a hipótese 1:** existe `pg_cron`, webhook ou Edge Function
   chamando `expire_auctions()`? Consulta na seção 7.
3. **Revisar `docs/remediacao_NAO_APLICADA/02_revogar_9_rpcs.sql`** — em especial
   a ordem `GRANT service_role` antes do `REVOKE`, e a trava que aborta se não
   encontrar exatamente 9.
4. **Revisar o agrupamento das 14 RPCs em 4 famílias** (`PLANO_REMEDIACAO.md`, F).
   Contestar se a divisão estiver errada.
5. **Contestar a ordem dos 19 itens** (K), se discordar.

---

## 7. SQL PARA EXECUÇÃO

TIPO: **READ_ONLY** · RISCO: **ZERO**

OBJETIVO: descobrir se algo agenda `expire_auctions()`. É o que falta para
aposentá-la com segurança.

```sql
-- 1) pg_cron, se a extensao existir
SELECT 'pg_cron' AS fonte, jobname, schedule, command
FROM cron.job
WHERE command ILIKE '%expire_auctions%'
   OR command ILIKE '%liberar_saldos%'
   OR command ILIKE '%confirmar_recebimento%';

-- 2) qualquer funcao do banco que chame expire_auctions por dentro
SELECT 'funcao chama' AS fonte, p.proname, '' , ''
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname <> 'expire_auctions'
  AND pg_get_functiondef(p.oid) ILIKE '%expire_auctions%';

-- 3) trigger que a chame
SELECT 'trigger' AS fonte, t.tgname, c.relname, p.proname
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND pg_get_functiondef(p.oid) ILIKE '%expire_auctions%';
```

Fora do SQL, a OpenAI deve conferir no painel: **Database → Webhooks** e
**Edge Functions**, procurando chamada a `expire_auctions`.

---

## 8. ROLLBACK

**NÃO APLICÁVEL** para a consulta acima.
Para o que está preparado: `docs/remediacao_NAO_APLICADA/04_rollback.sql`, ciclo
já testado. Para os commits de código: `git revert`.

---

## 9. O QUE A SEGUNDA IA PRECISA TE DEVOLVER

- resultado das três consultas — **existe algo agendando `expire_auctions`?**
- o que ela conferiu em **Webhooks** e **Edge Functions**
- crítica ao `771856e1`: o corte por streaming tem furo? o prazo tem furo?
- crítica aos 61 testes: o que ficou de fora
- concordância ou contestação do agrupamento das 14 em 4 famílias
- concordância ou contestação da ordem dos 19 itens

**REGRA 4:** nomes, condições, contagens. Nenhuma PII.
**REGRA 12:** divergiu → registrar e parar.

---

## 10. DECISÃO PENDENTE DO DONO

Ordem completa em `docs/PLANO_REMEDIACAO.md`, seção K. Os cinco primeiros, que
**não quebram nada** e podem ir assim que ele acordar:

1. **RLS** em `livoo_lives` e `livoo_webhook_deliveries` — 5 min, zero uso no front.
2. **Revogar as 9 RPCs** — 20 min, scripts prontos e ciclo testado.
3. **Apagar `wcfg_read`** de `wa_config` — 5 min, só `service_role` lê.
4. **Abrir o PR** de segurança — `manageCoupons` **segue vulnerável em produção**
   até esse merge.
5. **Apagar as 150 policies `authenticated_*`** — rollback de 182 comandos testado.

Depois disso, o que fecha de verdade é o item **17** (`SESSAO_MODO=bloquear`), e
ele depende dos itens 7, 8, 15 e 16.

---

## 11. PRÓXIMO PASSO RECOMENDADO

OpenAI audita os 6 commits de código e responde se existe `pg_cron`, webhook ou
Edge Function chamando `expire_auctions()` — é o único dado que falta para
aposentar a função e acabar com os dois motores de encerramento.
