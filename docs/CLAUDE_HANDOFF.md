# CLAUDE → OPENAI HANDOFF

> Canal técnico entre Claude (investigação/implementação) e OpenAI (auditoria
> independente + execução operacional). Contém **somente o estado atual**.
> Sem histórico acumulado. Sem PII, senha, chave, token ou documento.

## 1. ESTADO

Data/hora: **2026-08-21 04:13 UTC**

Branch: `claude/project-structure-analysis-r1prad`

Base SHA: `56efd74b8efbd49f18d16c44b6e26c247622b8f4`

Head SHA: `17cf1f2773e5bea591cd3eb1ea4c16627e92a688` (último commit de código; o commit deste handoff fica em cima)

Main SHA conhecida: `56efd74b8efbd49f18d16c44b6e26c247622b8f4`

Modo atual:
- **SOMENTE LEITURA**

Produção alterada?
**NÃO**

Banco alterado?
**NÃO**

Código alterado?
**NÃO nesta etapa.** A branch carrega 2 commits de código de etapas anteriores, ainda **sem PR e fora de produção** (ver seção 5).

---

## 2. O QUE FOI ANALISADO

Auditoria de segurança completa do Leilão NoZap, cruzando código e banco:

- 135 rotas em `api/functions/`, 32 bibliotecas em `api/_lib/`
- fluxo de upload, autenticação, autorização, Loja Virtual, Leilões, Comparai
- `vercel.json`, `package.json` (`npm audit`), GitHub (branches, colaboradores, Actions)
- diagnóstico executado no banco de produção em 21/08 (RLS, policies, grants, funções, buckets)
- snapshot + rollback de policies/grants gerado e **testado em ciclo ida-e-volta** num PostgreSQL 16 real: aplicar → estado muda → rollback numa transação → estado idêntico ao original
- investigação forense somente-leitura de encerramento de leilões

Nada foi alterado em produção. `git status` limpo antes deste commit.

---

## 3. ACHADOS

Somente fatos comprovados por leitura de código ou saída do banco.

### P0

**A01 — Documentos de KYC em balde público e listável**
- FATO: `src/pages/Carteira.jsx:52` sobe RG/CNH, selfie com documento e comprovante de endereço via `Core.UploadFile`; `src/api/base44Adapter.js:634` grava no balde `public-assets` e devolve `getPublicUrl()`. `api/functions/submitKyc.js` persiste essas URLs em `kyc_data`.
- EVIDÊNCIA: 7 de 8 baldes são públicos (`auctions, avatars, banners, concurso, products, produtos, public-assets`); só `documentos-assinados` é privado. Policy `"Public read all leilonozap buckets"` é `FOR SELECT TO PUBLIC USING (bucket_id = ANY(...))` sobre `storage.objects` — ou seja, permite **listar** o balde, não só abrir por link.
- RISCO: vazamento em lote de documento de identidade com selfie. Dado sensível sob LGPD.
- COMO VALIDAR: tentar `storage.list('public-assets', {prefix:'uploads/'})` com a chave anon.
- COMO CORRIGIR: balde privado dedicado + upload por rota server-side com crachá + URL assinada de validade curta + migração das URLs em `kyc_data`.
- ROLLBACK: manter os arquivos originais até a cópia privada estar íntegra e referenciada.
- COMO PROVAR QUE FOI FECHADO: visitante anônimo recebe 403 ao tentar listar e ao tentar baixar por URL direta.

**A02 — 57 tabelas com leitura liberada ao anônimo**
- FATO: 57 policies com condição `true` alcançando `anon` (a chave publicada no bundle). RLS é por linha, não por coluna.
- EVIDÊNCIA (contagem do banco, sem expor valores): `app_users` com **26** linhas de `password` em texto puro, **307** e-mails, **298** telefones, **76** CPFs, **42** saldos. Também abertas: `wallets`, `digital_wallets`, `wallet_transactions`, `withdrawal_requests`, `payments`, `asaas_payments`, `commission_records`, `catalog_sales`, `products`, `bids`, `luxury_access_codes`, `wa_config`, `wa_conversations`, `wa_messages`.
- RISCO: PII em massa + credenciais legíveis + códigos de acesso de leilão fechado.
- BLOQUEIO ESTRUTURAL: o site **não usa Supabase Auth** — `base44.auth.login` existe em `src/api/base44Adapter.js:658` e nunca é chamado. `auth.uid()` é sempre nulo, logo **é impossível escrever política "cada um vê só a sua linha"**. A única correção é tirar a leitura do navegador.
- CUSTO: **127** chamadas `AppUser.list/filter/get` no front, incluindo login (`LoginModal.jsx:143`) e restauração de sessão (`Layout.jsx:286`).

**A03 — Upload sem validação de caminho, tipo ou tamanho**
- FATO: `src/api/base44Adapter.js:634` — `finalPath = path || ...` (caminho vem do cliente), `upsert: true`, `contentType: file?.type` (tipo vem do cliente), sem limite de tamanho.
- RISCO: sobrescrever arquivo existente no balde; subir SVG/HTML com script servido do próprio domínio (XSS armazenado).

**A04 — Saques e movimentações financeiras legíveis por anônimo**
- FATO: `withdrawal_requests` e `wallet_transactions` com `public_read` condição `true`. `api/functions/getAdminFinanceQueue.js:31` mostra que `withdrawal_requests` guarda `user_name, user_email, valor, pix_key, status`.
- CUSTO PARA FECHAR: apenas 5 leituras diretas no front.

**A08 — 26 funções `SECURITY DEFINER` executáveis por `PUBLIC`/`anon`**
- FATO (saída do banco): as 26 têm `EXECUTE` para `PUBLIC, anon, authenticated` e `prosecdef = true`, portanto ignoram RLS.
- Escrevem/mudam estado: `expire_auctions`, `liberar_saldos_maturados`, `confirmar_recebimento`, `aplicar_cupom`.
- Leem com poder de dono recebendo o id do dono como **parâmetro**: `vendas_auditoria`, `distribuidor_dash`, `distribuidor_rede`, `distribuidor_vendas`, `distribuidor_vendas_resumo`, `loja_dash`, `loja_estoque`, `loja_vitrine`, `loja_catalogo`, `marketing_resumo`, `meta_do_usuario`, `painel_atividade`, `ranking_dia`, `ranking_periodo`, `evolucao_diaria`, `evolucao_vendedores_diaria`, `find_user_by_phone`, `busca_estoque`, `avaliacao_loja`, `vendedores_disponiveis`, `livoo_ao_vivo_agora`, `concurso_ranking_periodo`.
- FRAGMENTOS JÁ LIDOS (o grid do painel truncou o resto):
  - `confirmar_recebimento`: `with rel as ( update public.commission_ledger l set status='disponivel', ...` → **escreve**, libera comissão para sacável.
  - `liberar_saldos_maturados`: `where t.status='a_liberar' and t.release_at is not null and exists ( select 1 from public.catalog_sales s ...` → **escreve**.
  - `find_user_by_phone`: `select u.id, u.full_name, u.email, u.role, u.primary_career_level, ... from app_users u` → devolve cadastro completo **com o papel**.
  - `expire_auctions`: `RETURNS integer / LANGUAGE plpgsql / SECURITY DEFINER` — corpo ainda não lido.
- **9 das 26 podem ser revogadas sem quebrar tela** (0 ocorrências em `src/`; quem chama são rotas do servidor com service_role): `busca_estoque`, `concurso_ranking_periodo`, `confirmar_recebimento`, `expire_auctions`, `find_user_by_phone`, `liberar_saldos_maturados`, `livoo_ao_vivo_agora`, `loja_catalogo`, `vendedores_disponiveis`.
- As outras 17 **são chamadas pelo navegador** (`supabase.rpc(...)` em `src/`) — revogar derruba Painel do Distribuidor, Ranking, Vitrine, Carrinho e Meu Estoque.

**A10 — `livoo_lives` e `livoo_webhook_deliveries` sem RLS**
- FATO: `relrowsecurity = false` nas duas; `anon` tem `SELECT, INSERT, UPDATE, DELETE, TRUNCATE`.
- Só rotas do servidor usam essas tabelas (`api/functions/livooWebhook.js`, `livooOpenLive.js`). Zero uso no front.

### P1

- **B01** `catalog_sales` público expõe `buyer_cpf`, `buyer_address`, `buyer_phone` de todo pedido.
- **B02** `products` público expõe `cost_price` e `selling_price_*` de 3.138 produtos.
- **B03** **150 policies** `authenticated_insert/update/delete` com condição `true` em **50 tabelas** (inclui `bids`, `auctions`, `wallets`, `withdrawal_requests`, `payments`). Inertes hoje porque ninguém é `authenticated`; reativam sozinhas se o cadastro do Supabase for religado.
- **B04** Nenhum limite de chamadas no servidor. O freio de rajada vive só no navegador (`src/api/base44Adapter.js`); `api/functions/entityWrite.js` não tem 429. Login sem limite de tentativa.
- **B05** `vercel.json` sem nenhum header de segurança: sem CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **B06** `npm audit`: 2 críticas, 21 altas (React Router XSS via open redirect, jsPDF ReDoS, lodash code injection).
- **B08** `main` com `protected: false`, zero GitHub Actions, 1 colaborador. Push na main vai direto para produção sem revisão nem teste.
- **B09** Crachá com validade de 30 dias (`api/_lib/sessao.js`), sem revogação, guardado em `localStorage`. Sem MFA no admin.

### P2

- **C01** `api/functions/getGoogleClientId.js` com `Access-Control-Allow-Origin: *`.
- **C02** `api/functions/login.js:27` faz `select=*` em `app_users` — qualquer coluna nova vai para o navegador.
- **C03** `system_logs` aceita `INSERT` de `anon` (migration `20260805`). O anti-duplicação é client-side.
- **C04** `api/functions/resizeImage.js` cai em `res.redirect(302, url)` — redirecionamento aberto para qualquer URL pública.

### P3

- **D01** 40+ variáveis de ambiente sem rotação documentada.
- **D02** Pasta `base44/` ainda versionada (código morto).
- **D03** `TABLE_MAP` em `src/api/base44Adapter.js` entrega o mapa de tabelas no bundle.

---

## 4. HIPÓTESES AINDA NÃO PROVADAS

1. **`expire_auctions` permite forçar encerramento de leilão.** Não li o corpo. Se ela filtrar por `end_time` como o cron faz (`api/functions/finalizeExpiredAuctions.js:24`), o impacto é pequeno; se encerrar qualquer leilão que receber, é manipulação direta do resultado. **A consulta da seção 7 responde isso.**
2. **As 17 funções de painel não conferem quem chamou.** O padrão (id do dono como parâmetro) sugere que não, mas não está provado. **A segunda consulta da seção 7 responde isso.**
3. **`wa_config` guarda credencial de WhatsApp.** A tabela está com leitura pública. `api/functions/waProxy.js:59` faz `select=*` nela. Não sei quais colunas existem.
4. **`payment_settings` guarda credencial de gateway.** Mesma situação.
5. **Houve uso indevido de `expire_auctions` em algum momento.** **Não há evidência.** Ver seção "forense" abaixo — e ver a limitação do método.

### Correções de hipóteses minhas que caíram (registrar para não repetir)

- **`credit_commission` aberta ao anônimo — FALSO.** Ela, `cancelar_venda`, `comprar_com_saldo`, `estornar_para_carteira` e `increment_coupon` são `EXECUTE` só do dono. As cinco funções de dinheiro estão fechadas.
- **`password_reset_token` e `access_token` preenchidos — FALSO.** Zero linhas nas duas colunas.
- **`"Anon upload during import"` sem restrição de balde — FALSO.** A policy real é `FOR INSERT TO anon WITH CHECK (bucket_id = ANY (ARRAY['avatars','products','banners','auctions','public-assets']))`. `documentos-assinados` nunca esteve alcançável. Meu diagnóstico imprimia só `polqual` (USING) e policy de INSERT usa `polwithcheck` — defeito da minha consulta, conclusão errada em cima dela.

### Forense de encerramento de leilão — resultado e limitação

- 53 leilões encerrados analisados. 34 classificados "ANORMAL" pela consulta.
- **Os 34 são falso positivo.** Todos com `updated_date = 2026-08-21 00:32:19.024425+00`, idêntico ao microssegundo, todos com título "Plano de Investimento", 0 lances, preço inalterado. É um `UPDATE` em massa — o que marcou `is_investment_plan = true` em 21/08. Os 5 de "atraso grande" idem (carimbos `2026-06-30 03:03:32.337962` e `2026-05-27 01:38:02.174264`, também em bloco).
- **Limitação do método:** usei `updated_date` como hora de encerramento. Não é — é hora da última alteração. Qualquer `UPDATE` posterior apaga a evidência. A forense **não detecta** encerramento forçado seguido de outra alteração.
- **Grupo de controle limpo:** os 14 encerramentos legítimos ficaram entre `0.0` e `0.7` minutos após o `end_time`. O cron da Vercel está preciso. Nenhum leilão com lance real fechou fora da hora; nenhum vencedor ou preço suspeito.
- **Conclusão: não há sinal de uso indevido. Não é o mesmo que provar que não houve.**

---

## 5. ALTERAÇÕES REALIZADAS

**Nesta etapa: NENHUMA ALTERAÇÃO** além deste próprio arquivo.

A branch carrega 2 commits de código de etapas anteriores, **aguardando revisão**:

Branch: `claude/project-structure-analysis-r1prad`

| Estado | |
|---|---|
| COMMIT CRIADO | `0ebfebcc` — fecha SSRF em `proxyImage`, blinda `resizeImage`, `buscarFotosPorImagem`, `marketSearch`; novo `api/_lib/urlSegura.js` |
| COMMIT CRIADO | `17cf1f27` — crachá de sessão em 57 rotas (cobertura 8 → 68 de 135), em **modo observação**; `manageCoupons` ganha checagem real de admin |
| PR CRIADO | **NÃO** |
| PR MERGEADO | **NÃO** |
| DEPLOY PREVIEW | **NÃO** |
| DEPLOY PRODUÇÃO | **NÃO** |

Banco: nenhuma alteração.
Vercel: nenhuma alteração.

`npm run build` sai 0 na branch.

---

## 6. AÇÃO NECESSÁRIA DA SEGUNDA IA

1. **EXECUTAR SQL SOMENTE LEITURA** — as duas consultas da seção 7.
2. **VERIFICAR RPC** — confirmar de forma independente quem tem `EXECUTE` nas 26 funções `SECURITY DEFINER`, sem reaproveitar a minha consulta (REGRA 5).
3. **COMPARAR BRANCH** — conferir `claude/project-structure-analysis-r1prad` contra `main` (`56efd74b`) e validar que os 2 commits não duplicam nada já mergeado.

---

## 7. SQL PARA EXECUÇÃO

### CONSULTA 1 — corpo completo das 4 funções, linha por linha

TIPO: **READ_ONLY**

RISCO: **ZERO**

OBJETIVO:
Provar o que cada função realmente faz. Especificamente: se `expire_auctions`
filtra por `end_time` (como o cron faz) ou encerra qualquer leilão que receber;
e confirmar que `confirmar_recebimento` e `liberar_saldos_maturados` escrevem em
tabelas de dinheiro. O grid do painel trunca célula longa, por isso a consulta
devolve **uma linha do resultado por linha de código**.

RESULTADO ESPERADO:
Um `WHERE ... end_time` dentro de `expire_auctions` significa impacto limitado.
A ausência dele significa que qualquer visitante encerra qualquer leilão ativo —
e isso vira o P0 número 1 do projeto.

SQL:

```sql
SELECT p.proname AS funcao, l.n AS linha, l.txt AS codigo
FROM pg_proc p
JOIN pg_namespace ns ON ns.oid = p.pronamespace,
LATERAL unnest(string_to_array(pg_get_functiondef(p.oid), E'\n')) WITH ORDINALITY AS l(txt, n)
WHERE ns.nspname = 'public'
  AND p.proname IN ('expire_auctions','liberar_saldos_maturados',
                    'confirmar_recebimento','find_user_by_phone')
ORDER BY p.proname, l.n;
```

### CONSULTA 2 — raio-X das funções SECURITY DEFINER abertas ao anônimo

TIPO: **READ_ONLY**

RISCO: **ZERO**

OBJETIVO:
Classificar as 26 de uma vez em três eixos: escreve no banco, confere quem
chamou, filtra por `end_time`. A coluna `confere_quem_chamou` é a mais
importante da auditoria: se vier `false` nas funções de painel, está provado
que qualquer um lê os dados de qualquer distribuidor trocando o id no parâmetro.

RESULTADO ESPERADO:
Cada linha `escreve_no_banco = true` com `confere_quem_chamou = false` é uma
função que muda estado sem saber quem pediu — P0 imediato.
Cada linha `escreve_no_banco = false` com `confere_quem_chamou = false` é
leitura cruzada entre usuários — P0 de exposição.

SQL:

```sql
SELECT p.proname AS funcao,
       pg_get_functiondef(p.oid) ILIKE '%end_time%'              AS filtra_por_end_time,
       pg_get_functiondef(p.oid) ~* '\m(insert|update|delete)\M' AS escreve_no_banco,
       (pg_get_functiondef(p.oid) ILIKE '%auth.uid%'
        OR pg_get_functiondef(p.oid) ILIKE '%current_setting%')  AS confere_quem_chamou,
       length(pg_get_functiondef(p.oid))                         AS tamanho_do_codigo
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
              WHERE a.privilege_type = 'EXECUTE'
                AND (a.grantee = 0 OR a.grantee::regrole::text = 'anon'))
ORDER BY escreve_no_banco DESC, p.proname;
```

---

## 8. ROLLBACK

**NÃO APLICÁVEL.** As duas consultas são `SELECT`. Não alteram nada.

---

## 9. O QUE A SEGUNDA IA PRECISA TE DEVOLVER

Da **CONSULTA 1**:

- corpo completo de `expire_auctions`;
- se `expire_auctions` filtra por `end_time`;
- se `expire_auctions` escreve no banco e em quais tabelas;
- se `expire_auctions` aceita parâmetro (id de leilão) ou opera em lote;
- corpo completo de `liberar_saldos_maturados` — em qual tabela escreve e sob qual condição;
- corpo completo de `confirmar_recebimento` — se muda `commission_ledger.status` e se valida quem é o dono da venda;
- corpo completo de `find_user_by_phone` — quais colunas devolve.

Da **CONSULTA 2**:

- a tabela inteira (26 linhas), sem cortar;
- quantas têm `escreve_no_banco = true`;
- quantas têm `confere_quem_chamou = false`;
- se alguma das 17 usadas pelo navegador confere identidade.

**Validação independente pedida (REGRA 5):** confirmar por consulta própria, sem
reusar a minha, quem tem `EXECUTE` nas 26 funções — quero saber se as duas
leituras batem antes de qualquer revogação.

**REGRA 4:** devolver apenas nomes de função, nomes de coluna, condições e
contagens. Nenhum valor de linha de `app_users`, `kyc_data`, `withdrawal_requests`
ou qualquer tabela com PII.

**REGRA 12:** se a sua leitura divergir da minha em qualquer ponto, registre a
divergência aqui e **pare**. Nenhuma revogação antes de resolver.

---

## 10. DECISÃO PENDENTE DO DONO

AGUARDANDO AUTORIZAÇÃO DO DONO PARA:

1. **Bloco 1 — revogar `EXECUTE`** de `PUBLIC`/`anon`/`authenticated` nas 9 funções sem uso no navegador, concedendo antes a `service_role`. Snapshot e rollback prontos e testados.
2. **Bloco 2 — ligar RLS** em `livoo_lives` e `livoo_webhook_deliveries`.
3. **Bloco 3 — apagar as 150 policies** `authenticated_*` de escrita, em lotes de 40.
4. **Bloco 4 — estreitar a policy de upload anônimo** de 5 baldes para `public-assets`.
5. **Tratar as 26 contas com senha em texto** (gerar hash em `app_users_auth`, provar 26/26, zerar a coluna, invalidar sessão, exigir redefinição — senha exposta é senha comprometida).
6. **Abrir PR** dos commits `0ebfebcc` e `17cf1f27`.

Nenhum desses foi executado. O snapshot de rollback (182 comandos: 1 limpeza + 27 grants + 2 RLS + 150 policies + 2 storage) já foi gerado e exportado pelo dono.

---

## 11. PRÓXIMO PASSO RECOMENDADO

Executar as duas consultas `READ_ONLY` da seção 7 e devolver os corpos das
funções, porque a decisão de revogar o `EXECUTE` do `expire_auctions` depende de
saber se ela filtra por `end_time` ou encerra qualquer leilão que receber.
