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

Data/hora: **2026-08-21 06:05 UTC**

Branch: `claude/project-structure-analysis-r1prad`
Base: `56efd74b` · Head: `4f2ca4dd` (+ o commit deste handoff)
Main conhecida: `56efd74b8efbd49f18d16c44b6e26c247622b8f4`

Modo: **IMPLEMENTAÇÃO EM BRANCH · PRODUÇÃO INTOCADA**

```
Produção alterada ..... NÃO      Banco alterado ........ NÃO
main alterada ......... NÃO      Merge ................. NÃO
Deploy produção ....... NÃO      SESSAO_MODO ........... intocado
RLS ................... intocada 9 revogações .......... NÃO executadas
pg_cron ............... NÃO tocado — segue ATIVO em produção
```

```
COMMIT CRIADO ..... SIM · 11 na sprint
DEPLOY PREVIEW .... SIM · automático, aponta para o Supabase de produção
PR CRIADO ......... NÃO
DEPLOY PRODUÇÃO ... NÃO
```

`npm run build` exit 0 · `npm test` **65/65** · worktree limpa.

---

## 2. O QUE FOI ANALISADO

Incorporação do achado do `pg_cron` e das duas ressalvas da OpenAI sobre o
commit `771856e1`. Revisão completa do Bloco 1.

---

## 🚨 3. ACHADO QUE MUDA A PRIORIDADE DE TUDO

### A14 deixou de ser risco de ataque. É defeito operacional ativo há 52 dias.

```
pg_cron   job "expire-auctions"   * * * * *   SELECT public.expire_auctions();
          ativo desde 30/06 · 75.365 execuções

Vercel    finalizeExpiredAuctions  * * * * *   (vercel.json:28)
```

**Dois motores de encerramento correndo a cada minuto, e só um liquida.**

| | Vercel | pg_cron |
|---|---|---|
| define `winner_id` | sim | não |
| `order_status = awaiting_payment` | sim (`finalizeAuctionCore.js:299`) | **não** |
| paga comissão de 5% | sim | **não** |
| devolve reserva dos perdedores | sim | **não** |
| mensagem de vitória | sim | **não** |

E os dois lados filtram por `status in (active, processing)`
(`finalizeExpiredAuctions.js:24`, `finalizeAuctionCore.js:291`). Quando o
`pg_cron` chega primeiro, o leilão sai desse estado e **a Vercel deixa de
enxergá-lo para sempre**.

Edge Functions: zero. Webhook de banco: nenhum. Ou seja, **não há terceiro motor** —
e também não há nada além do `pg_cron` a considerar para desligá-lo.

### A assinatura do dano é exata

`submitAtomicBid.js:371` grava `winner_id` a **cada lance**. Quem grava
`order_status` é o finalizador da Vercel. Logo:

> **leilão COM lance + encerrado + `order_status` VAZIO = o `pg_cron` chegou
> primeiro e a liquidação nunca aconteceu.**

**Isto ainda é HIPÓTESE sobre os dados.** Existe explicação alternativa
(`reactivateAuction.js` pode zerar campos), e a consulta 3 do
`00_dano_A14_leitura.sql` separa as duas pelo histórico de lances. Não vou
afirmar que há leilão danificado antes de ver o resultado.

**O que mais importa:** a consulta 4 procura reserva que entrou no
`reserva_ledger` e nunca saiu em leilão já encerrado — isso é **saldo de
participante travado agora**, não risco futuro.

---

## 4. HIPÓTESES AINDA NÃO PROVADAS

1. **Quantos leilões foram efetivamente danificados** e **quanto dinheiro está
   travado.** `00_dano_A14_leitura.sql` responde. Precisa rodar **antes** de
   desligar o job — depois disso o padrão muda e não dá mais para medir.
2. **DNS rebinding** continua aberto no `urlSegura`. Registrado no arquivo, não
   marcado como resolvido.
3. `raw_base44` em `payment_settings` contém segredo. Ninguém leu.

---

## 5. ALTERAÇÕES REALIZADAS

### Código, testado na branch

| Commit | O quê |
|---|---|
| `771856e1` | `urlSegura`: streaming, contador incremental, `AbortController`, prazo próprio no laço de leitura |
| `879c0e4f` | **novo** — confere o DNS antes de buscar (nome público apontando pra dentro) e descarta corpo de 3xx/404/tipo recusado/tamanho excedido |
| `bf4ab7a1` + `879c0e4f` | 46 testes de `urlSegura` |
| `cefbc251` | 19 testes de autorização de `manageCoupons` |
| `b6c6f5dd` | `npm audit fix` sem breaking: 32 → 11 |
| `f02163f1` | CI mínima, sem segredo, sem deploy |

**Sobre as duas ressalvas da OpenAI ao `771856e1`:**

- **Corpo não cancelado em redirect/erro — CORRIGIDO** (`879c0e4f`). Procedia.
- **DNS rebinding — PARCIALMENTE ENDEREÇADO, e digo com todas as letras o que
  ficou de fora.** Agora o nome é resolvido antes do fetch e todo endereço
  devolvido (IPv4 e IPv6) passa pela régua de rede interna, em cada salto. Isso
  fecha o caminho fácil: domínio público que aponta para dentro (`nip.io`,
  `localtest.me`). **Não fecha rebinding**: entre a conferência e a conexão há
  uma janela, e quem controla o DNS responde IP público agora e interno logo
  depois. Fechar de verdade exige fixar o IP conferido na conexão, o que o
  `fetch` do runtime não permite sem trocar o dispatcher. **Fica como risco
  residual registrado, não como resolvido.**

### Preparado e NÃO aplicado

`docs/remediacao_NAO_APLICADA/` — **Bloco 1 reescrito**:

| Ordem | Arquivo | Tipo |
|---|---|---|
| 1 | `00_dano_A14_leitura.sql` | READ_ONLY — mede o estrago |
| 2 | `01_diagnostico_pre.sql` | READ_ONLY — fotografa permissões |
| 3 | `02b_desligar_pg_cron.sql` | **WRITE — desliga o segundo motor** |
| 4 | `02_revogar_9_rpcs.sql` | WRITE — revoga EXECUTE |
| 5 | `03_verificacao_pos.sql` | READ_ONLY |
| — | `04_rollback.sql` / `04b_rollback_pg_cron.sql` | WRITE — desfaz |

**Por que o `02b` vem antes do `02`:** revogar o EXECUTE sem desligar o job não
resolve. O `pg_cron` roda com o dono do job, que provavelmente não perde a
permissão — teríamos fechado a porta de entrada errada achando que resolveu.

O `02b` usa `active = false` em vez de `cron.unschedule()`: mantém o job
cadastrado, e religar vira um `UPDATE`. E confere **antes de desligar** se houve
encerramento nas últimas 2 h — para não deixar o sistema sem motor nenhum caso a
Vercel esteja com problema.

`docs/PLANO_REMEDIACAO.md` e `docs/OPENAI_RETURN.md` seguem publicados.

---

## 6. AÇÃO NECESSÁRIA DA SEGUNDA IA

1. **Executar `00_dano_A14_leitura.sql`** (READ_ONLY, 6 consultas). É a coisa
   mais urgente do projeto: mede quantos leilões não liquidaram e se há saldo de
   participante travado. **Antes de qualquer desligamento.**
2. **Revisar `02b_desligar_pg_cron.sql`** — em especial: `active=false` é
   suficiente no Supabase, ou o `cron.unschedule()` é obrigatório? E a
   conferência das 2 h cobre o caso de não haver leilão vencendo no período?
3. **Confirmar com que usuário o job roda** (`cron.job.username`). Se for
   `postgres` ou o dono das funções, isso confirma que revogar `anon` não o
   afetaria — que é a razão de o `02b` existir.
4. **Auditar `879c0e4f`** — a conferência de DNS tem furo? O `descartarCorpo`
   ficou em todos os caminhos de saída?
5. **Contestar a ordem revisada** do Bloco 1, se discordar.

---

## 7. SQL PARA EXECUÇÃO

TIPO: **READ_ONLY** · RISCO: **ZERO**
Arquivo completo: `docs/remediacao_NAO_APLICADA/00_dano_A14_leitura.sql`
(6 consultas — faixas de encerramento, casos suspeitos, separação de leilão
reativado, reserva presa, o job e o histórico de execuções).

Mais esta, que responde direto ao item 3 acima:

```sql
SELECT jobid, jobname, schedule, active, username, database, nodename
FROM cron.job
WHERE command ILIKE '%expire_auctions%';
```

---

## 8. ROLLBACK

`04_rollback.sql` (permissões, ciclo testado em PostgreSQL 16 real) e
`04b_rollback_pg_cron.sql` (religa o job). Código: `git revert`.

⚠️ Religar o job **traz o defeito de volta**. É medida de emergência para o
sistema não ficar sem motor, não é solução.

---

## 9. O QUE A SEGUNDA IA PRECISA TE DEVOLVER

- resultado das 6 consultas do `00` — **quantos leilões e quanto dinheiro**
- `cron.job.username` do job `expire-auctions`
- se `active = false` basta no Supabase ou se precisa `cron.unschedule()`
- crítica ao `879c0e4f` (DNS e descarte de corpo)
- concordância ou contestação da ordem revisada: `00 → 01 → 02b → 02 → 03`

**REGRA 4:** contagens, ids de leilão e valores agregados. Nenhum dado de pessoa.
**REGRA 12:** divergiu → registrar e parar.

---

## 10. DECISÃO PENDENTE DO DONO

**A ordem mudou por causa do `pg_cron`.** O que era "revogar 9 funções" virou
"desligar um motor de encerramento que está em produção há 52 dias".

1. **Rodar `00_dano_A14_leitura.sql`** — só leitura, pode ser agora. Define o
   tamanho do problema e se há dinheiro travado.
2. **Desligar o job do `pg_cron`** (`02b`) — este é o que fecha o defeito.
   Risco MÉDIO: se a Vercel falhar depois, os leilões param de encerrar. Por
   isso o script confere antes e o `04b` religa.
3. **Revogar as 9 RPCs** (`02`) — depois do `02b`, não antes.
4. **RLS em `livoo_lives` e `livoo_webhook_deliveries`** — 5 min, zero risco.
5. **Apagar `wcfg_read`** de `wa_config` — 5 min, zero risco.
6. **Abrir o PR de segurança** — `manageCoupons` segue vulnerável em produção
   até esse merge.
7. **Apagar as 150 policies `authenticated_*`** — rollback de 182 comandos testado.

Ordem completa dos 19 itens em `docs/PLANO_REMEDIACAO.md`, seção K.

---

## 11. PRÓXIMO PASSO RECOMENDADO

OpenAI roda `00_dano_A14_leitura.sql` e diz quantos leilões ficaram sem liquidar
e quanto saldo de participante está travado — porque isso decide se o próximo
passo é só desligar o motor ou também reparar dado, e reparar dado é decisão que
só o dono toma.
