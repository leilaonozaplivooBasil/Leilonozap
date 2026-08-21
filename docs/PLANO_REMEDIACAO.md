# PLANO DE REMEDIAÇÃO — LEILÃO NOZAP

> Produzido na sprint de 21/08/2026. **Nada aqui foi aplicado.** É projeto de
> engenharia para o dono aprovar e a OpenAI auditar. Cada bloco traz AÇÃO, RISCO,
> CÓDIGO/SQL, TESTE, ROLLBACK, DEPENDÊNCIAS e ORDEM.

---

## E — `expire_auctions`: dois motores de encerramento

### O problema, em uma frase

Existem **dois** caminhos que tiram um leilão do estado `active`, e só um deles
liquida. O que não liquida está aberto ao anônimo.

### O que cada motor faz

| | `finalizeExpiredAuctions` (Vercel, 1×/min) | `expire_auctions()` (RPC no banco) |
|---|---|---|
| Quem chama | cron da Vercel, com `service_role` | **qualquer um**, inclusive anônimo |
| Filtro | `status in (active,processing)` + `end_time <= now()` | `status='active'` + `end_time < now()` |
| Define vencedor | **sim** (`winner_id`, `winner_name`, `current_price`) | **não** |
| `order_status` | **sim** (`awaiting_payment`) | **não** |
| Comissão de 5% ao indicador | **sim** | **não** |
| Devolve reserva dos perdedores | **sim** | **não** |
| Mensagem de vitória | **sim** | **não** |
| Claim atômico | **sim** (`finalizeAuctionCore.js:291`) | não precisa |

### Por que isso vira ataque (A14 — confirmado pelas duas IAs)

`finalizeExpiredAuctions.js:24` e `finalizeAuctionCore.js:291` filtram **os dois**
por `status in (active, processing)`. Leilão já marcado `ended` ou `sold` é
**invisível para a esteira inteira**, e o claim que não acha linha retorna
`already_finalized: true` e sai sem fazer nada (`finalizeAuctionCore.js:305`).

Então: entre o `end_time` e o próximo tique do cron existe uma janela de até
60 segundos. Quem chamar `expire_auctions()` nessa janela tira o leilão da
esteira **para sempre**. Resultado: sem vencedor, sem comissão, sem mensagem, e
**com o saldo reservado dos participantes preso** — porque quem devolve é o
finalizador que nunca vai rodar.

É em lote (uma chamada alcança todo leilão que fechou naquele minuto), é
repetível, e não há limite de chamadas (achado B04).

### As três opções, avaliadas pelo código

**OPÇÃO 1 — só revogar o EXECUTE público.**
Fecha o acesso anônimo hoje. Mas **mantém dois motores**: o dia em que alguém
chamar `expire_auctions()` com a chave de serviço — um script de manutenção, um
cron novo, uma automação — o mesmo estrago acontece, agora sem atacante nenhum.
Trata o sintoma.

**OPÇÃO 2 — aposentar `expire_auctions` e deixar só `finalizeExpiredAuctions`.**
Elimina a causa: um motor só. Custo: precisa provar que **nada** depende dela.
Verificado do lado do repositório — `grep -rn "expire_auctions"` em `src/`, `api/`
e `supabase/` retorna **zero** ocorrências fora das minhas próprias notas. Ela não
está em migration nenhuma, ou seja, foi criada à mão no painel. **Ninguém do
projeto a chama.**
⚠️ O que eu **não** consigo verificar daqui: se existe `pg_cron`, webhook do
Supabase, Edge Function ou automação externa chamando. **Isso a OpenAI precisa
conferir antes** — é a única coisa que separa esta opção de ser óbvia.

**OPÇÃO 3 — reescrever para reivindicar sem tirar da esteira.**
Ex.: marcar `status='processing'` em vez de `ended`, mantendo o leilão visível
para o finalizador. Resolve o conflito sem apagar a função. Custo: reescrever uma
função de produção que ninguém chama, para um caso de uso que ninguém pediu.
Complexidade sem demanda.

### Recomendação

**OPÇÃO 2, chegando lá pela OPÇÃO 1.**

O dono disse preferir minimizar dois motores. O código concorda — mas a preferência
não vira ordem sem prova, e a prova ainda tem um buraco (`pg_cron`/webhook).
Então:

1. **Agora:** revogar o EXECUTE (já está no Bloco 1 — `docs/remediacao_NAO_APLICADA/`).
   Fecha a porta anônima hoje, sem apagar nada, com rollback de um comando.
2. **Depois de a OpenAI confirmar que nada agenda a função:** aposentar de vez.

Aposentar não é `DROP` de cara. É:

```sql
-- ⛔ NÃO APLICADO · WRITE_PRODUCTION · RISCO: BAIXO · só depois da confirmação
-- Etapa 1: neutraliza sem apagar. Se algo chamar, chama e não faz nada.
CREATE OR REPLACE FUNCTION public.expire_auctions()
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  RAISE WARNING 'expire_auctions foi aposentada em 2026-08-21. '
                'Quem encerra leilao e api/functions/finalizeExpiredAuctions.js '
                '(cron da Vercel), que tambem define vencedor, paga comissao e '
                'devolve reserva. Chamada ignorada.';
  RETURN 0;
END $$;
REVOKE ALL ON FUNCTION public.expire_auctions() FROM PUBLIC, anon, authenticated;

-- Etapa 2, semanas depois, se o WARNING nunca aparecer no log: DROP FUNCTION.
```

**ROLLBACK:** guardar o `pg_get_functiondef` original antes (o `01_diagnostico_pre`
já fotografa as permissões; para o corpo, a OpenAI precisa colar o texto no
handoff) e recriar.

**TESTE:** encerrar um leilão de teste e conferir que o vencedor foi definido, a
comissão saiu e a reserva dos perdedores voltou. Não testar contra preview — o
preview aponta para o Supabase de produção (REGRA 14).

---

## F — as 14 RPCs com IDOR: projeto de migração

Todas recebem o id do dono **como parâmetro**, lido do `localStorage` do
navegador. Trocar o número entrega o painel de outra pessoa. Sendo
`SECURITY DEFINER`, ignoram RLS.

**A correção não é revogar** — derrubaria cinco telas. É mover a chamada para o
servidor e **derivar a identidade do crachá**, nunca do corpo.

### Não criar 14 rotas. Criar 4.

As 14 se agrupam sozinhas por tela e por dono:

**FAMÍLIA 1 — `POST /api/functions/painelRede`** (5 RPCs)
`distribuidor_dash` · `distribuidor_rede` · `distribuidor_vendas` ·
`distribuidor_vendas_resumo` · `painel_atividade`
Tela: `PainelDistribuidor.jsx`. Dono: `dist_id` / `_owner`.
Dado: rede de indicados, vendas, resumo, atividade recente.
Se trocar o id: vê a rede e o faturamento de qualquer distribuidor.
Identidade: do crachá. O parâmetro `dist_id` **deixa de existir** no corpo.

**FAMÍLIA 2 — `POST /api/functions/painelLoja`** (3 RPCs)
`loja_dash` · `loja_estoque` · `marketing_resumo`
Telas: `PainelDistribuidor.jsx`, `MeuEstoque.jsx`, `TirarPedido.jsx`.
Dono: `_owner` (+ `_ref`, que é o `referral_code` e **não protege nada** — mora
em `app_users`, tabela de leitura pública).
Dado: faturamento da loja, estoque com custo, resumo de marketing.
Se trocar o id: vê estoque e margem de qualquer loja.

**FAMÍLIA 3 — `POST /api/functions/painelRanking`** (5 RPCs)
`ranking_dia` · `ranking_periodo` · `evolucao_diaria` ·
`evolucao_vendedores_diaria` · `meta_do_usuario`
Telas: `RankingDia.jsx`, `RankingFull.jsx`, `EvolucaoDiaria.jsx`,
`EvolucaoVendedores.jsx`, `MetaBanner.jsx`.
Dono: `_owner` / `uid`.
Dado: posição no ranking, evolução, meta pessoal.
Se trocar o id: vê a performance e a meta de qualquer pessoa da rede.
⚠️ Parte do ranking é **legitimamente coletiva** (a pessoa precisa ver os outros
para saber a própria posição). A rota decide **o que** devolver: posição e nomes,
sim; valores individuais de comissão, não.

**FAMÍLIA 4 — `POST /api/functions/painelAuditoria`** (1 RPC)
`vendas_auditoria`
Tela: `VendasAuditoria.jsx`. Dono: `_owner`, `_lim` até 500.
Dado: auditoria de venda a venda. É a mais sensível das 14 — fica sozinha para
poder ter regra própria (ex.: só admin, ou só o próprio dono, sem exceção).

### Padrão das quatro rotas

```js
// esqueleto comum — identidade vem do crachá, NUNCA do corpo
import { conferirSessao } from '../_lib/sessao.js';

const s = conferirSessao(req);
const dono = s.ok ? s.userId : String(body?.owner_id || '').trim();  // ETAPA 1
// ETAPA 2 (SESSAO_MODO=bloquear): if (!s.ok) return 401; const dono = s.userId;
```

Mesmo rollout em duas etapas que já funcionou duas vezes: na ETAPA 1 a rota
continua aceitando o id do corpo **e anota no log** quando ele não bate com o
crachá; na ETAPA 2 o corpo deixa de ser considerado. Sem isso, migrar 14 chamadas
de uma vez quebra tela.

**RISCO DE QUEBRA:** MÉDIO. Cinco telas. Uma família por vez, com teste manual.
**ROLLBACK:** as RPCs continuam existindo; reverter o commit devolve o
comportamento antigo. Só depois que as quatro famílias estiverem em produção e
estáveis é que se revoga o EXECUTE das 14.
**ORDEM:** 3 (ranking, mais simples) → 2 (loja) → 1 (rede) → 4 (auditoria).

---

## G — dados públicos e RLS: o que é público de verdade

Regra que vale para todas: **`auth.uid()` é sempre nulo neste projeto** — o site
não usa Supabase Auth (`base44.auth.login` existe em `base44Adapter.js:658` e
nunca é chamado). Logo **não existe política "cada um vê só a sua linha"**. Só há
dois estados possíveis: aberto para todo mundo, ou fechado e lido por rota de
servidor. Não há meio-termo.

| Tabela | Público de verdade | Nunca deveria sair | Quem lê hoje no navegador | Substituição | Risco |
|---|---|---|---|---|---|
| `app_users` | `id`, `full_name`, `nickname`, `avatar_url`, `store_name`, `referral_code` | cpf, pix_key, email, phone, endereço, todos os saldos, **password** | **127 chamadas** — login, sessão, indicação, painel | 6 rotas: perfil próprio · nome público de terceiro · árvore de rede · busca admin · login · indicação | **ALTO** |
| `withdrawal_requests` | nada | tudo — valor, PIX, e-mail | 5 chamadas | 1 rota admin + `getMyWallet` (já existe) | BAIXO |
| `wallet_transactions` | nada | tudo | 2 chamadas | `getDigitalWalletHistory` (já existe) | BAIXO |
| `catalog_sales` | nada (o comprador vê o próprio pedido pela rota) | buyer_cpf, buyer_address, buyer_phone, buyer_email | 15 chamadas | rota de pedidos com crachá | MÉDIO |
| `products` | título, foto, `price_catalog`, `selling_price_*`, estoque | **`cost_price`**, `raw_base44` | vitrine inteira | **view** `products_publicos` sem coluna de custo | MÉDIO |
| `payment_settings` | nada | `raw_base44` e tudo mais | nenhuma rota do projeto escreve nela | fechar; se alguma tela ler, rota | BAIXO |
| `wa_config` | nada | `ai_prompt`, `backend_url` | nenhuma — só `waProxy.js:59` e `waWebhook.js:94`, com service_role | fechar direto | **ZERO** |
| `livoo_lives` | nada | tudo | nenhuma | ligar RLS, sem política | **ZERO** |
| `livoo_webhook_deliveries` | nada | tudo | nenhuma | ligar RLS, sem política | **ZERO** |

### Ordem (do que não quebra para o que quebra)

1. `livoo_lives`, `livoo_webhook_deliveries` — ligar RLS. Zero dependência no front.
2. `wa_config` — apagar `wcfg_read`. Zero dependência no front.
3. `payment_settings` — apagar `public_read`. Verificar antes se alguma tela lê.
4. `withdrawal_requests`, `wallet_transactions` — rota primeiro, 5 e 2 chamadas.
5. `products` — criar a view, apontar a vitrine, depois apagar a política.
6. `catalog_sales` — 15 chamadas.
7. `app_users` — 127 chamadas. Por último, sempre.

**Nunca apagar política antes da rota substituta existir e a tela estar apontada
para ela.** Foi por isso que a FASE 1 original não podia começar por `app_users`.

---

## H — KYC e upload: projeto técnico

### Hoje

`src/pages/Carteira.jsx:52` → `Core.UploadFile` → `base44Adapter.js:634` →
balde **`public-assets`** (público) → `getPublicUrl()` → URL salva em `kyc_data`.
São documento de identidade frente e verso, **selfie segurando o documento** e
comprovante de endereço. `kyc_data` tem **2 registros** — o alcance é 2 pessoas,
não centenas, mas o tipo do dado não admite tolerância.

Agrava: a política `"Public read all leilonozap buckets"` é `FOR SELECT TO PUBLIC`
sobre `storage.objects` nos 5 baldes — permite **listar** o conteúdo, não só abrir
por link.

### Alvo

```
NAVEGADOR
  → POST /api/functions/uploadDocumento   (crachá obrigatório)
      • allowlist de MIME: image/jpeg, image/png, image/webp, application/pdf
      • NUNCA image/svg+xml
      • teto de 8 MB
      • confere os BYTES INICIAIS do arquivo, não o content-type declarado
      • nome gerado pelo servidor: <userId>/<sha256 do conteúdo>.<ext>
      • upsert: false
  → balde PRIVADO `documentos-kyc`
  → kyc_data guarda o CAMINHO, não a URL
  → leitura: GET /api/functions/lerDocumentoKyc → URL assinada de 60 s,
      só para o dono do documento ou para admin conferido no banco
```

**Por que guardar caminho e não URL:** URL assinada expira. Guardar URL na tabela
significa guardar algo que morre. O caminho é estável; a URL é gerada na hora.

### Migração dos 2 registros existentes, na ordem que não perde nada

1. criar o balde privado `documentos-kyc` (painel do Supabase);
2. subir a rota `uploadDocumento` e apontar `Carteira.jsx` para ela — **novos KYC
   param de ir para o balde público neste ponto**;
3. copiar os arquivos dos 2 registros para o balde novo (script server-side);
4. conferir tamanho e hash de cada cópia contra o original;
5. gravar o caminho novo em `kyc_data`, mantendo a URL antiga numa coluna
   `url_legado` — nada é sobrescrito;
6. `AdminFinanceiro.jsx` passa a pedir a URL assinada;
7. provar que visitante anônimo recebe 403 na URL nova;
8. **só então** apagar os arquivos do balde público.

**Nunca apagar o original antes do passo 7.** Se o passo 4 acusar diferença de
hash, parar.

**ROLLBACK:** `url_legado` continua na tabela e os arquivos originais continuam no
lugar até o passo 8. Reverter é apontar a tela de volta.

### `Core.UploadFile` — o upload geral (não-KYC)

Separado do KYC e igualmente quebrado (`base44Adapter.js:634`):
`finalPath = path || ...` (caminho vem do cliente), `upsert: true`,
`contentType: file?.type` (tipo vem do cliente), sem limite de tamanho.
Permite sobrescrever arquivo existente do balde e subir SVG com script servido do
próprio domínio.
Correção: mesma rota de servidor, mesma allowlist, `upsert:false`, nome gerado
pelo servidor. **Risco de quebra MÉDIO** — todo upload do site passa por ali.

---

## I — CI

Feito nesta sprint: `.github/workflows/ci.yml`. Instala, lint (informativo),
build e testes. **Sem segredo, sem Supabase, sem Vercel, sem deploy,
`permissions: contents: read`.** Motivo de não ir além está no cabeçalho do
arquivo. `npm run lint` acusa 71 erros hoje (70 auto-corrigíveis) — limpar é item
próprio, não entra como bloqueio de PR agora.

---

## K — ORDEM DE EXECUÇÃO

| # | Remediação | Risco | Tempo | O que pode quebrar | Rollback | Quem valida | OpenAI confere | Autorização |
|---|---|---|---|---|---|---|---|---|
| 1 | Ligar RLS em `livoo_lives` e `livoo_webhook_deliveries` | BAIXO | 5 min | nada — zero uso no front | `ALTER ... DISABLE` | dono | estado de RLS depois | **sim** |
| 2 | Revogar EXECUTE das 9 RPCs (`docs/remediacao_NAO_APLICADA/`) | BAIXO | 20 min | robô do WhatsApp, confirmar recebimento, carteira, concurso | `04_rollback.sql` | dono testa as 4 telas | `03_verificacao_pos` | **sim** |
| 3 | Apagar `wcfg_read` de `wa_config` | BAIXO | 5 min | nada — só service_role lê | recriar policy | dono | policy sumiu | **sim** |
| 4 | Merge do PR de segurança (`0ebfebcc`, `17cf1f27`, +sprint) | BAIXO | 30 min | tela de Cupons em aba antiga | `git revert` | dono + OpenAI | diff e CI | **sim** |
| 5 | Apagar as 150 policies `authenticated_*` de escrita, em lotes de 40 | BAIXO | 40 min | nada — ninguém é `authenticated` | rollback de 182 comandos, já testado | dono | contagem por lote | **sim** |
| 6 | Estreitar upload anônimo para `public-assets` | BAIXO | 15 min | upload de foto de produto | recriar policy antiga | dono testa upload | policy nova | **sim** |
| 7 | Rota de upload + balde privado de KYC (bloco H) | MÉDIO | 1 dia | envio de documento na Carteira | `url_legado` + arquivos originais | dono | 403 para anônimo | **sim** |
| 8 | Migrar as 14 RPCs para 4 rotas (bloco F) | MÉDIO | 2 dias | 5 telas de painel | revert do commit | dono, tela a tela | identidade vem do crachá | **sim** |
| 9 | Tratar as 26 senhas em texto | MÉDIO | 2 h | login de 26 contas | hash antes de zerar | dono | `password` zerado 26/26 | **sim** |
| 10 | Fechar `withdrawal_requests` e `wallet_transactions` | BAIXO | 3 h | 5 e 2 chamadas | recriar policy | dono | policies sumiram | **sim** |
| 11 | View pública de `products` sem `cost_price` | MÉDIO | 4 h | vitrine e loja | apontar de volta | dono | `cost_price` fora da view | **sim** |
| 12 | Headers no `vercel.json` (CSP, HSTS, X-Frame-Options…) | MÉDIO | 3 h | CSP mal calibrada quebra script | reverter o bloco | dono | headers na resposta | **sim** |
| 13 | Limite de chamadas por IP na borda | BAIXO | 4 h | falso positivo em cliente legítimo | desligar | dono | 429 sob carga | **sim** |
| 14 | Aposentar `expire_auctions` (bloco E) | BAIXO | 1 h | nada, **se** nada a agendar | recriar corpo | dono | `pg_cron`/webhook | **sim** |
| 15 | `catalog_sales` fora do navegador | MÉDIO | 1 dia | 15 chamadas | revert | dono | policy | **sim** |
| 16 | `app_users` fora do navegador — 6 rotas | **ALTO** | 3–5 dias | login, sessão, indicação, admin | revert por rota | dono, passo a passo | cada rota | **sim** |
| 17 | `SESSAO_MODO=bloquear` | **ALTO** | 15 min | qualquer tela sem crachá | apagar a variável | dono | log limpo 48 h antes | **sim** |
| 18 | Dependências major (jspdf, sharp, @vercel/og, xlsx) | MÉDIO | 1 dia | PDF, miniatura, imagem de share, importação | revert do lockfile | dono | build + telas | **sim** |
| 19 | Proteger a branch `main` | BAIXO | 10 min | ninguém empurra direto | desligar | dono | config do GitHub | **sim** |

**O que fecha buraco de verdade:** 1, 2, 3, 5, 6 (hoje, sem quebrar nada) e
**17** — que é o único que transforma o crachá em barreira. Os itens 7, 8, 15 e 16
são a reforma estrutural; sem eles o item 17 é o teto do que dá para proteger.

**Nada disso é autoexecutável.** Cada linha depende da autorização do dono, e
cada uma tem rollback antes de ter aplicação.
