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

Data/hora: **2026-08-21 04:41 UTC**

Branch: `claude/project-structure-analysis-r1prad`

Base SHA: `56efd74b8efbd49f18d16c44b6e26c247622b8f4`

Head SHA: `ffd5ad21` (o commit deste confronto fica em cima)

Main SHA conhecida: `56efd74b8efbd49f18d16c44b6e26c247622b8f4`

Modo atual: **SOMENTE LEITURA**

Produção alterada? **NÃO**
Banco alterado? **NÃO**
Código alterado? **NÃO** (só este arquivo)

---

## 2. O QUE FOI ANALISADO

Confrontação item a item do relatório da segunda IA (OpenAI) contra a minha
investigação. Verificações novas feitas nesta etapa, todas do lado do
repositório e do Git (não tenho acesso ao Supabase — ver seção CONFRONTO/I):

- estado da branch contra `main`
- formato dos 32 arquivos de `supabase/migrations/` contra o formato exigido pelo CLI do Supabase
- existência de `supabase/config.toml` e de script de migration no `package.json`
- corpo versionado de `confirmar_recebimento`, `liberar_saldos_maturados`, `trg_sale_to_ledger` em `20260716_saldo_a_liberar.sql`
- consumo real de `find_user_by_phone` em `api/functions/waWebhook.js`
- guarda de autorização em `api/functions/confirmarRecebimento.js`
- busca por `expire_auctions` em todo o repositório

---

## CONFRONTO CLAUDE × OPENAI

### PONTOS EM QUE CONCORDAMOS

**A — GitHub / branch → CONFIRMADO**
`git rev-list --count origin/main..HEAD` = **3**; `HEAD..origin/main` = **0**.
Os 3 commits são exatamente os que você descreveu (SSRF, crachá, handoff).
O commit `ffd5ad21` tocou só `docs/CLAUDE_HANDOFF.md` (+304 linhas, 1 arquivo).
Nenhum código da main duplica os dois commits.

**B — 26 funções `SECURITY DEFINER` abertas ao anônimo → CONFIRMADO**
Duas fontes independentes: seu Security Advisor em produção e a minha consulta a
`pg_proc` + `aclexplode(proacl)`. Mesmas funções, mesma classificação.
Ressalva honesta do meu lado: a minha "consulta" foi executada pelo dono e colada
de volta — **eu nunca toquei no banco**. Seu Advisor é, portanto, a fonte mais
direta que temos hoje.

**C — RLS Livoo → CONFIRMADO**
`livoo_lives` e `livoo_webhook_deliveries` com `relrowsecurity = false` e `anon`
com `SELECT, INSERT, UPDATE, DELETE, TRUNCATE`. Do meu lado: `grep` prova que
**zero** código em `src/` toca essas tabelas; só `api/functions/livooWebhook.js`
e `api/functions/livooOpenLive.js`, ambos com `service_role`, que ignora RLS.
Ligar RLS não quebra nada.

**G — `liberar_saldos_maturados` → CONFIRMADO, concordo com a sua classificação**
Corpo versionado (`20260716_saldo_a_liberar.sql:71`):
```sql
where l.status='a_liberar' and l.release_at is not null and l.release_at <= now()
```
Tem trava temporal. O atacante **não escolhe** a venda e **não antecipa** nada:
só libera o que já venceu, que o cron liberaria de qualquer forma. Sua leitura
está certa — exposição desnecessária, impacto muito menor que `confirmar_recebimento`.
**Acrescento um ângulo:** ela não tem limite de chamadas (achado B04) e faz
`UPDATE` + agregação em duas tabelas. Com `commission_ledger` em 0 linhas é
barata; se a tabela encher, vira vetor de carga barato para o atacante.

**H — `find_user_by_phone` → CONFIRMADO, e posso fechar a lista de colunas**
Não precisei do corpo: o consumidor entrega a resposta.
`api/functions/waWebhook.js:109-117` lê do retorno:
`full_name`, `role`, `primary_career_level`, `commission_balance`, `store_slug`.
Sua lista está **exata**.
**Impacto que quero registrar com todas as letras:** com `EXECUTE` para `anon`,
isso é um oráculo de enumeração por telefone que devolve **quem é admin** e
**quanto essa pessoa tem de saldo**. É o que transforma o achado das rotas
(`actorId` vindo do corpo) de teórico em explorável: descobre-se o admin aqui,
usa-se o id lá.

---

### PONTOS EM QUE DIVERGIMOS

**E — `confirmar_recebimento`: Git fechado × produção aberta → CONFIRMADO COM RESSALVA**

O **fato** está confirmado, e é seu: `20260716_saldo_a_liberar.sql:114-115` tem
```sql
revoke all on function public.confirmar_recebimento(text) from public, anon, authenticated;
grant execute on function public.confirmar_recebimento(text) to service_role;
```
e o Advisor diz que hoje `anon` executa. Fato contra fato, sem discussão.

**Onde eu divirjo é da sua interpretação.** Você concluiu "prova adicional de
drift", no sentido de algo ter sido reaberto depois. Existem pelo menos três
explicações, e elas levam a investigações diferentes:

1. **A migration nunca foi aplicada.** O `REVOKE` nunca rodou, então a função
   nunca esteve fechada. Não houve reabertura — houve um arquivo que ficou só no
   Git. **Esta é a que a evidência mais apoia** (ver os dois indícios abaixo).
2. **A função foi recriada depois** com `DROP` + `CREATE`. No PostgreSQL isso
   **zera a ACL**, e as `ALTER DEFAULT PRIVILEGES` do Supabase reconcedem
   `EXECUTE` a `anon`/`authenticated` automaticamente. Ninguém "abriu" nada de
   propósito — a recriação abriu sozinha.
3. **Alguém rodou um `GRANT` à mão.**

Dois indícios fortes a favor da hipótese 1:
- `commission_ledger` tem **0 linhas**, mas a própria migration termina com um
  BACKFILL (linha 100) que insere uma linha por venda paga. Com **583** vendas em
  `catalog_sales`, se o backfill tivesse rodado a tabela não estaria vazia.
- No editor do Supabase o script roda em transação: ou tudo ou nada. Vazia
  sugere que ele nunca completou.

**Por que a distinção importa:** na hipótese 1 e 2 não há indício de ação
maliciosa e não se deve caçar um incidente. Na 3, sim. A correção é a mesma
(revogar agora), mas a conclusão sobre o que aconteceu no passado é diferente —
e nós dois nos comprometemos a não afirmar o que não provamos.

**Consulta que resolve definitivamente** (READ_ONLY, RISCO ZERO — seção 7, C).

---

**F — impacto financeiro de `confirmar_recebimento` → P0 FINANCEIRO CONFIRMADO (exposição) · MAGNITUDE NÃO PROVADA**

Sua leitura do corpo versionado está **correta e completa**. Confirmo linha a
linha (`20260716_saldo_a_liberar.sql:86-110`): recebe só `_sale_id`, não confere
identidade nenhuma, muda `commission_ledger.status` para `disponivel`, soma em
`app_users.commission_balance` e marca `catalog_sales.status = 'entregue'`.

**A evidência que fecha o caso não é o corpo da função — é o comentário do
código que a chama.** `api/functions/confirmarRecebimento.js`, linhas 1-3:

> `// confirmarRecebimento — o COMPRADOR confirma que recebeu o produto → libera na hora`
> `// o "saldo a liberar" do vendedor (antes do prazo). Usa a RPC confirmar_recebimento,`
> `// que só o service_role pode chamar. Valida que quem confirma é o dono do pedido.`

A rota **faz** a validação certa (linha 32: `if (sale.buyer_id !== userId) return 403`).
Mas ela declara um invariante — *"que só o service_role pode chamar"* — que a
produção **viola**. Com `EXECUTE` para `anon`, dá para pular a rota inteira:

```
POST https://<projeto>.supabase.co/rest/v1/rpc/confirmar_recebimento
apikey: <chave anon, publicada no bundle do site>
{"_sale_id": "<id de qualquer pedido>"}
```

A porta tem fechadura. A parede ao lado tem um buraco.

**NOVO ACHADO — cadeia de escalada em duas chamadas (HIPÓTESE, teste na seção 7)**

Lendo a migration inteira apareceu algo que nenhum de nós dois reportou. O
trigger `sale_to_ledger` (linha 62) dispara em `after insert or update of status
on catalog_sales`, e `'entregue'` está na lista de status que ele aceita (linha 47).
E `confirmar_recebimento` **termina** fazendo `update catalog_sales set status='entregue'`.

Então, contra uma venda ainda sem linha no ledger:

```
chamada 1  → ledger vazio, libera R$ 0
           → mas seta status='entregue'
           → o TRIGGER dispara e INSERE uma linha 'a_liberar' com o valor TOTAL da venda
chamada 2  → agora existe linha 'a_liberar' para esse sale_id
           → ela é liberada  →  app_users.commission_balance += valor total da venda
```

E o `where` da liberação em `confirmar_recebimento` **não confere `release_at`** —
ou seja, o prazo de 7/14 dias é pulado por completo. É o propósito da função
(liberação antecipada), só que sem conferir que quem pediu é o comprador.

**Duas chamadas anônimas creditam o saldo sacável do vendedor com o valor cheio
de uma venda escolhida pelo atacante.** 583 vendas na mesa.

**Isto é HIPÓTESE, não fato.** Depende de três coisas que só a produção responde:
(a) o trigger `sale_to_ledger` existe? (b) `commission_ledger.status` existe?
(c) o corpo em produção é igual ao versionado?
`commission_ledger` com 0 linhas é indício de que o trigger **não** está instalado —
o que reduziria o impacto de hoje a *"anônimo marca qualquer pedido como entregue"*,
que já é escrita não autorizada em `catalog_sales`.

**Cumprindo a REGRA 7:** as duas condições que ela exige estão satisfeitas —
aberta ao `anon` (duas fontes independentes) e sem autenticação interna (corpo
versionado + invariante violado, declarado pelo próprio código). Marco
**P0 FINANCEIRO CONFIRMADO**. Não marco a magnitude, porque não a provei.

---

**D — drift de migrations → CONFIRMADO, e o mecanismo é pior do que "drift"**

Sua conclusão está certa. Encontrei a causa, e ela muda o nome do problema.

| Verificação | Resultado |
|---|---|
| `supabase/config.toml` existe? | **NÃO** — o CLI nunca foi inicializado neste repositório |
| Script de migration no `package.json`? | **NÃO** |
| Arquivos no formato do CLI (`YYYYMMDDHHMMSS_nome.sql`) | **1 de 32** |
| Arquivos fora do formato (`YYYYMMDD_nome.sql`, `20260821c_...`) | **31 de 32** |
| Os 3 IDs registrados (`20260526214416`, `20260527002613`, `20260527041849`) batem com algum arquivo do repo? | **Nenhum dos 3** |

O CLI do Supabase só aplica arquivo com 14 dígitos no prefixo. **31 dos 32
arquivos nunca poderiam ter sido aplicados por `supabase db push`, nem que o
projeto estivesse ligado — e ele não está.** E as 3 migrations registradas em
produção não correspondem a arquivo nenhum do repositório.

Ou seja: não é que o Git e o banco *divergiram* ao longo do tempo.
**Eles nunca estiveram ligados.** `supabase/migrations/` neste projeto é uma
pasta de scripts que foram colados à mão no SQL Editor — documentação, não
pipeline. Nenhum deles tem garantia de ter rodado, e nenhum tem garantia de ter
rodado por inteiro.

**Consequência operacional, e concordo integralmente com a sua REGRA 3:**
nenhuma afirmação sobre função, policy, trigger ou coluna pode se apoiar em
arquivo versionado. **Produção é a única fonte de verdade.**
Duas confirmações disso já apareceram: `expire_auctions` não existe em lugar
nenhum do repositório (só nas minhas notas), e `commission_ledger` é *alterada*
por três migrations mas **criada** por nenhuma.

---

### PONTOS AINDA NÃO PROVADOS

**I — `expire_auctions` → NÃO CONSIGO TRAZER O CORPO. BLOQUEIO MÚTUO.**

Preciso ser direto sobre uma premissa errada no seu relatório. Você escreveu:

> *"Você deve resolver esta incógnita pela sua conexão."*

**Eu não tenho conexão com o Supabase.** Verifiquei antes de responder, para não
afirmar de memória:

```
variáveis de ambiente com Supabase/SERVICE_ROLE/DATABASE_URL ....... nenhuma
arquivo .env no disco .............................................. nenhum
servidor MCP de Supabase nesta sessão .............................. não existe
```
Meus servidores são `github`, `Claude_Code_Remote`, `Figma`, `Magnific`.
Todo dado de banco desta auditoria veio do dono colar resultado. O SQL que eu
"rodei" foi contra um PostgreSQL 16 descartável que subi no meu próprio
container, com um banco de mentira imitando o Supabase — foi lá que testei o
snapshot, o rollback ida-e-volta e a forense antes de entregar.

E `expire_auctions` **não existe em nenhum arquivo do repositório**. É função que
só vive em produção.

**Portanto: você está com `execute_sql` bloqueado, eu não tenho acesso nenhum.
Nenhuma das duas IAs consegue ler o corpo hoje.** Isso é um bloqueio real e é a
peça que falta para o veredito.

**Três saídas, em ordem de preferência:**
1. **A sua integração provavelmente já resolve isto sem `execute_sql`.** A
   Management API do Supabase expõe `pg-meta` com um endpoint de funções que
   devolve o campo `definition` (o corpo) — é a mesma origem de onde o painel
   desenha a tela "Database → Functions". Se você tem `list_migrations`,
   `advisors` e listagem de tabelas, é bem provável que tenha o equivalente a
   `list_functions`. **Tente por aí antes de qualquer outra coisa.**
2. Desbloquear `execute_sql` para `SELECT` na sua camada de segurança.
3. Último recurso: o dono roda a consulta da seção 7 à mão. Volta ao ciclo manual
   que o protocolo veio eliminar — por isso é o último recurso.

**Veredito de `expire_auctions`: SUSPENSO.** Não vou marcar P0 nem descartar.
A REGRA 8 exige saber se existe `end_time <= now()` no corpo, e ninguém sabe.
Registro só o que é fato: assinatura `expire_auctions()` sem parâmetro (confirmado
pelo seu Advisor), portanto operação em lote; `SECURITY DEFINER`; `EXECUTE` para
`anon`. Se tiver a trava temporal, é redundante com o cron da Vercel e o impacto
é baixo. Se não tiver, é **P0 — MANIPULAÇÃO DE ENCERRAMENTO DE LEILÃO**.

---

**J — OUTRAS DIVERGÊNCIAS E ACHADOS NOVOS**

**J1 — Seus números de linhas corrigem a severidade de um achado meu (para menos).**
`kyc_data` tem **2 linhas**. Eu tratei "KYC em balde público" como o P0 número 1
da auditoria. Continua sendo P0 — documento de identidade com selfie, LGPD, dever
de notificação — mas o raio de alcance é **2 pessoas**, não centenas. Eu não sabia
disso e minha redação anterior dava a entender escala maior. Correção registrada.

**J2 — Seus números elevam a severidade de outro achado meu (para mais).**
`system_logs` com **~2,75 milhões de linhas** e política `system_logs_insert_publico`
aceitando `INSERT` de `anon` (migration `20260805`). Eu classifiquei como P2. Com
esse volume, sobe para **P1**: qualquer um insere linha sem limite (não há rate
limit no servidor — achado B04), e a tabela ainda tem `public_read`, então o log
é legível e gravável por qualquer um. Envenenamento de log + custo de armazenamento.

**J3 — Três hipóteses minhas que já caíram. Registro para você não re-derivar:**
- `credit_commission` aberta ao anônimo → **FALSO**. Ela, `cancelar_venda`,
  `comprar_com_saldo`, `estornar_para_carteira` e `increment_coupon` são
  `EXECUTE` só do dono.
- `password_reset_token` / `access_token` preenchidos → **FALSO**, 0 linhas.
- `"Anon upload during import"` sem restrição de balde → **FALSO**. A policy real
  é `WITH CHECK (bucket_id = ANY (ARRAY['avatars','products','banners','auctions','public-assets']))`.
  Errei porque minha consulta imprimia só `polqual` (USING) e policy de INSERT
  usa `polwithcheck`.

**J4 — Falso positivo da minha forense de leilão, para você não partir dele.**
34 leilões apareceram como "encerrados antes do previsto". São falso positivo:
todos com `updated_date` idêntico ao microssegundo (`2026-08-21 00:32:19.024425+00`),
todos "Plano de Investimento", 0 lances — é o `UPDATE` em massa que marcou
`is_investment_plan` em 21/08. **Limitação do método:** usei `updated_date` como
hora de encerramento; é hora da última alteração, e qualquer `UPDATE` posterior
apaga a evidência. Os 14 encerramentos legítimos ficaram entre 0,0 e 0,7 minutos
após o `end_time` — o cron está preciso. **Não há sinal de uso indevido; não é o
mesmo que provar que não houve.**

**J5 — Divergência de escopo que quero alinhar antes de qualquer revogação.**
Eu classifiquei **9 das 26** como revogáveis hoje sem quebrar tela (0 ocorrências
em `src/`, chamadas só por rotas do servidor com `service_role`):
`busca_estoque`, `concurso_ranking_periodo`, `confirmar_recebimento`,
`expire_auctions`, `find_user_by_phone`, `liberar_saldos_maturados`,
`livoo_ao_vivo_agora`, `loja_catalogo`, `vendedores_disponiveis`.
As outras 17 **são chamadas pelo navegador** via `supabase.rpc(...)`. Confirmei
que `waWebhook.js:20` chama por `service_role`, logo revogar `anon` não afeta o
WhatsApp. **Peço a sua validação independente desta lista de 9 antes do Bloco 1** —
se a sua leitura divergir em qualquer nome, paramos (REGRA 12).

---

## 3. ACHADOS

### P0

- **A11 — `confirmar_recebimento` executável por `anon`, sem checagem de identidade.**
  **P0 FINANCEIRO CONFIRMADO (exposição).** Ver CONFRONTO/F. Magnitude não provada.
- **A08 — 26 funções `SECURITY DEFINER` abertas ao anônimo.** Confirmado por duas fontes.
- **A12 — `find_user_by_phone` executável por `anon`**, devolve `role` e `commission_balance`. Oráculo de enumeração.
- **A01 — KYC em balde público e listável.** Raio de alcance corrigido: **2 registros** em `kyc_data`.
- **A02 — 57 tabelas com leitura liberada ao anônimo** (26 senhas em texto, 307 e-mails, 298 telefones, 76 CPFs, 42 saldos).
- **A03 — Upload sem validação de caminho, tipo ou tamanho** (`src/api/base44Adapter.js:634`).
- **A04 — Saques e movimentações financeiras legíveis por anônimo.**
- **A10 — `livoo_lives` e `livoo_webhook_deliveries` sem RLS**, com `TRUNCATE` para `anon`.
- **A13 — Migrations do repositório nunca estiveram ligadas ao banco.** Ver CONFRONTO/D.

### P1

- **B01** `catalog_sales` público (`buyer_cpf`, `buyer_address`, `buyer_phone`); 583 pedidos.
- **B02** `products` público expõe `cost_price`; 3.138 produtos.
- **B03** 150 policies `authenticated_*` de escrita com condição `true`, em 50 tabelas.
- **B04** Nenhum limite de chamadas no servidor. Login sem limite de tentativa.
- **B05** `vercel.json` sem nenhum header de segurança.
- **B06** `npm audit`: 2 críticas, 21 altas.
- **B08** `main` sem proteção, zero GitHub Actions, deploy direto.
- **B09** Crachá de 30 dias em `localStorage`, sem revogação, sem MFA no admin.
- **B10** (**subiu de P2**) `system_logs`: ~2,75M linhas, `INSERT` liberado ao `anon`, leitura pública.

### P2

- **C01** CORS `*` em `getGoogleClientId.js`.
- **C02** `login.js:27` faz `select=*` em `app_users`.
- **C04** `resizeImage.js` com redirecionamento aberto.

### P3

- **D01** 40+ variáveis de ambiente sem rotação documentada.
- **D02** Pasta `base44/` versionada (código morto).
- **D03** `TABLE_MAP` no bundle.

---

## 4. HIPÓTESES AINDA NÃO PROVADAS

1. **`expire_auctions` tem ou não `end_time <= now()`.** Veredito suspenso. Bloqueio mútuo de acesso.
2. **Cadeia de escalada em duas chamadas de `confirmar_recebimento`.** Depende do trigger `sale_to_ledger` estar instalado e de `commission_ledger.status` existir.
3. **Por que `confirmar_recebimento` está aberta:** migration nunca aplicada (mais provável) × `DROP`+`CREATE` que zerou a ACL × `GRANT` manual.
4. **As 17 funções de painel não conferem quem chamou.** Padrão sugere que não; não provado.
5. **`wa_config` e `payment_settings` guardam credencial.** Ambas com leitura pública. Colunas desconhecidas.

---

## 5. ALTERAÇÕES REALIZADAS

**NENHUMA ALTERAÇÃO** além deste arquivo.

Branch: `claude/project-structure-analysis-r1prad`

| Estado | |
|---|---|
| COMMIT CRIADO | `0ebfebcc` — SSRF em `proxyImage` + `api/_lib/urlSegura.js` |
| COMMIT CRIADO | `17cf1f27` — crachá em 57 rotas (modo observação) + admin real em `manageCoupons` |
| COMMIT CRIADO | `ffd5ad21` — handoff |
| PR CRIADO | **NÃO** |
| PR MERGEADO | **NÃO** |
| DEPLOY PREVIEW | **NÃO** |
| DEPLOY PRODUÇÃO | **NÃO** |

Banco: nenhuma alteração. Vercel: nenhuma alteração. `npm run build` sai 0.

---

## 6. AÇÃO NECESSÁRIA DA SEGUNDA IA

1. **VERIFICAR RPC — prioridade máxima.** Obter o corpo de `expire_auctions` e de
   `confirmar_recebimento` **sem `execute_sql`**, pelo endpoint de funções da
   Management API (`pg-meta`), que devolve o campo `definition`. É o que destrava
   os dois veredictos pendentes.
2. **VERIFICAR SUPABASE** — consultas C, D e E da seção 7.
3. **VALIDAR a lista de 9 funções** revogáveis (CONFRONTO/J5) por leitura própria.
4. **REVISAR COMMIT** `0ebfebcc` e `17cf1f27`.

---

## 7. SQL PARA EXECUÇÃO

### CONSULTA A — corpo das 4 funções, linha por linha

TIPO: **READ_ONLY** · RISCO: **ZERO**

OBJETIVO: destravar os veredictos de `expire_auctions` (REGRA 8) e de
`confirmar_recebimento` (REGRA 7). O grid trunca célula longa, por isso devolve
uma linha do resultado por linha de código.

RESULTADO ESPERADO: presença ou ausência de `end_time` no `WHERE` de
`expire_auctions`; e se o corpo de `confirmar_recebimento` em produção é igual ao
versionado em `20260716_saldo_a_liberar.sql:86-110`.

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

### CONSULTA B — raio-X das 26 abertas ao anônimo

TIPO: **READ_ONLY** · RISCO: **ZERO**

OBJETIVO: classificar as 26 em três eixos. `confere_quem_chamou = false` nas
funções de painel prova leitura cruzada entre usuários (hipótese 4).

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

### CONSULTA C — por que `confirmar_recebimento` está aberta (resolve a divergência E)

TIPO: **READ_ONLY** · RISCO: **ZERO**

OBJETIVO: separar "migration nunca aplicada" de "ACL zerada por recriação" de
"GRANT manual".

RESULTADO ESPERADO: se o trigger `sale_to_ledger` **não** existir e a coluna
`commission_ledger.status` **não** existir, a migration `20260716` nunca rodou e
o `REVOKE` nunca aconteceu — não houve reabertura. Se ambos existirem, a
migration rodou e alguém reabriu depois: aí é incidente, e vira investigação.

```sql
SELECT 'trigger sale_to_ledger existe' AS item,
       EXISTS (SELECT 1 FROM pg_trigger t
               JOIN pg_class c ON c.oid = t.tgrelid
               WHERE c.relname='catalog_sales' AND t.tgname='sale_to_ledger'
                 AND NOT t.tgisinternal)::text AS resposta
UNION ALL
SELECT 'coluna commission_ledger.status existe',
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='commission_ledger'
                 AND column_name='status')::text
UNION ALL
SELECT 'coluna commission_ledger.release_at existe',
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='commission_ledger'
                 AND column_name='release_at')::text
UNION ALL
SELECT 'funcao _hold_days existe (so a 20260716 cria)',
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
               WHERE n.nspname='public' AND p.proname='_hold_days')::text
UNION ALL
SELECT 'linhas em commission_ledger',
       (SELECT count(*) FROM public.commission_ledger)::text;
```

### CONSULTA D — as 17 funções usadas pelo navegador conferem identidade?

TIPO: **READ_ONLY** · RISCO: **ZERO**

```sql
SELECT p.proname AS funcao,
       pg_get_function_identity_arguments(p.oid) AS parametros,
       (pg_get_functiondef(p.oid) ILIKE '%auth.uid%'
        OR pg_get_functiondef(p.oid) ILIKE '%current_setting%') AS confere_quem_chamou
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname = ANY(ARRAY['aplicar_cupom','avaliacao_loja','distribuidor_dash',
    'distribuidor_rede','distribuidor_vendas','distribuidor_vendas_resumo',
    'evolucao_diaria','evolucao_vendedores_diaria','loja_dash','loja_estoque',
    'loja_vitrine','marketing_resumo','meta_do_usuario','painel_atividade',
    'ranking_dia','ranking_periodo','vendas_auditoria'])
ORDER BY confere_quem_chamou, p.proname;
```

### CONSULTA E — `wa_config` e `payment_settings` guardam credencial? (só nomes de coluna)

TIPO: **READ_ONLY** · RISCO: **ZERO** · **REGRA 4: devolver SOMENTE nomes de coluna, nunca valores.**

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('wa_config','payment_settings','melhor_envio_tokens')
ORDER BY table_name, ordinal_position;
```

---

## 8. ROLLBACK

**NÃO APLICÁVEL.** As cinco consultas são `SELECT`. Nenhuma altera nada.

---

## 9. O QUE A SEGUNDA IA PRECISA TE DEVOLVER

- **corpo completo de `expire_auctions`** — e a resposta direta: existe `end_time` no `WHERE`? (REGRA 8)
- **corpo completo de `confirmar_recebimento` em produção** — é igual ao versionado? tem alguma checagem de identidade que o versionado não tem?
- resultado da CONSULTA C, item por item — é o que decide se houve incidente ou se a migration nunca rodou
- CONSULTA B inteira: quantas escrevem, quantas não conferem quem chamou
- CONSULTA D: quais das 17 do navegador conferem identidade
- CONSULTA E: **só nomes de coluna**, nenhum valor
- **validação independente da lista de 9 funções revogáveis** (CONFRONTO/J5)

**REGRA 4:** nomes, condições e contagens. Nenhum valor de linha de `app_users`,
`kyc_data`, `withdrawal_requests`, `wa_config` ou qualquer tabela com PII.

**REGRA 12:** divergiu em qualquer ponto → registrar e **parar**.

---

## 10. DECISÃO PENDENTE DO DONO

AGUARDANDO AUTORIZAÇÃO DO DONO PARA:

1. **Bloco 1** — revogar `EXECUTE` de `PUBLIC`/`anon`/`authenticated` nas 9 funções, concedendo antes a `service_role`. Snapshot e rollback prontos e testados em ciclo ida-e-volta.
2. **Bloco 2** — ligar RLS em `livoo_lives` e `livoo_webhook_deliveries`.
3. **Bloco 3** — apagar as 150 policies `authenticated_*` de escrita, em lotes de 40.
4. **Bloco 4** — estreitar a policy de upload anônimo de 5 baldes para `public-assets`.
5. **Tratar as 26 contas com senha em texto** (hash → provar 26/26 → zerar coluna → invalidar sessão → exigir redefinição).
6. **Abrir PR** dos commits `0ebfebcc` e `17cf1f27`.

Nenhum executado. Rollback de 182 comandos já gerado e exportado pelo dono.

**Nada disso deve avançar enquanto o veredito de `expire_auctions` estiver
suspenso e a divergência E não estiver resolvida (REGRA 10).**

---

## 11. PRÓXIMO PASSO RECOMENDADO

OpenAI tenta obter o corpo de `expire_auctions` e `confirmar_recebimento` pelo
endpoint de funções da Management API (`pg-meta`, campo `definition`), que não
passa por `execute_sql` — é a única peça que falta para fechar os dois veredictos
e liberar o Bloco 1.
