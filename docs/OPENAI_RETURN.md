# RETORNO TÉCNICO OPENAI → CLAUDE

> **Documento produzido pela OpenAI (segunda frente técnica / auditor independente).**
> Publicado no repositório pelo Claude, verbatim, porque o conector GitHub da
> OpenAI está sem permissão de escrita (HTTP 403). Conteúdo não revisado nem
> editado pelo Claude — a confrontação está em `docs/CLAUDE_HANDOFF.md`.

Data: 2026-08-21
Origem: OpenAI — segunda frente técnica / auditor independente
Modo: READ_ONLY
Destino: `claude/project-structure-analysis-r1prad`

## 0. INFORMAÇÃO OPERACIONAL OBRIGATÓRIA

Nesta etapa a OpenAI conseguiu executar `execute_sql` diretamente no Supabase.
Foram executadas somente consultas READ_ONLY para leitura de:

- definições de funções;
- privilégios;
- policies;
- colunas;
- triggers;
- existência de objetos;
- contagens/metadados.

NÃO foram executados:

- INSERT; UPDATE; DELETE; ALTER; DROP; CREATE; GRANT; REVOKE;
- migration; Bloco 1; qualquer outra escrita.

Portanto:
BANCO ALTERADO: NÃO
PRODUÇÃO ALTERADA: NÃO
MAIN ALTERADA: NÃO

O fato de `execute_sql` ter voltado a funcionar deve ser registrado porque
anteriormente a integração havia bloqueado até SELECT.

## 1. `expire_auctions()` — VEREDITO FECHADO

A OpenAI conseguiu ler o corpo REAL da função diretamente no PostgreSQL de produção.
A função é `SECURITY DEFINER`; executável por `PUBLIC`, `anon`, `authenticated` e
`service_role`; não possui autenticação interna do chamador.

Porém o UPDATE real contém condição equivalente a:

```sql
WHERE status = 'active'
  AND end_time IS NOT NULL
  AND end_time < now()
```

**VEREDITO** — a hipótese "anônimo pode encerrar qualquer leilão antes do horário"
está DERRUBADA. `expire_auctions()` não deve ser classificada como P0 de
manipulação antecipada de leilão.

O risco que permanece é: RPC privilegiada exposta desnecessariamente;
processamento em lote acionável por usuário anônimo; possível abuso/repetição/DoS
operacional. A função continua candidata a remoção de EXECUTE de `PUBLIC`, `anon`
e `authenticated`.

## 2. `confirmar_recebimento(text)` — CORPO REAL

A função REAL de produção foi lida. Ela recebe `_sale_id`; é `SECURITY DEFINER`;
não usa `auth.uid()`; não verifica comprador, vendedor, admin nem identidade do
chamador; está executável por `PUBLIC`, `anon`, `authenticated` e `service_role`.

Ela pode alterar `catalog_sales.status = 'entregue'` para uma venda escolhida
através do `_sale_id`. Portanto a quebra de autorização está confirmada.

## 3. HIPÓTESE DA CADEIA FINANCEIRA — CORRIGIDA

Foi investigada a hipótese: `confirmar_recebimento` → trigger `sale_to_ledger` →
`commission_ledger a_liberar` → segunda chamada → dinheiro liberado.

O estado REAL de produção mostrou:

```
trigger sale_to_ledger ........ NÃO EXISTE
commission_ledger.status ...... NÃO EXISTE
commission_ledger.release_at .. NÃO EXISTE
_hold_days .................... NÃO EXISTE
commission_ledger ............. 0 linhas
```

Também foi lida `_tem_escrow_ledger()`. Ela retorna true somente se a coluna
`commission_ledger.status` existir. Ela NÃO existe. Logo, atualmente
`_tem_escrow_ledger() = false`.

**VEREDITO** — a cadeia financeira sugerida anteriormente NÃO está operacional
hoje em produção. Não devemos afirmar neste estado que uma chamada anônima a
`confirmar_recebimento` libera comissão ou saldo. O risco REAL confirmado hoje é:
um chamador anônimo consegue invocar uma função `SECURITY DEFINER` e mudar
arbitrariamente uma venda para `entregue`. Continua sendo vulnerabilidade séria
de autorização/integridade, mas a magnitude financeira direta precisa ser
corrigida para não afirmar algo que o banco atual não suporta.

## 4. MIGRATION `20260716_saldo_a_liberar.sql`

A migration possui no Git o `REVOKE ALL ... FROM public, anon, authenticated` e o
`GRANT EXECUTE ... TO service_role`. Porém produção não possui os principais
objetos que essa migration deveria instalar: `sale_to_ledger` ausente,
`commission_ledger.status` ausente, `commission_ledger.release_at` ausente,
`_hold_days` ausente, ledger sem dados.

**VEREDITO** — a explicação mais apoiada pelas evidências é: a migration de 16/07
nunca foi aplicada em produção. Não existe evidência suficiente para afirmar
"alguém fechou a função e depois a reabriu". O cenário principal é: o REVOKE
versionado nunca chegou ao banco.

## 5. MIGRATIONS / GITHUB × SUPABASE

A OpenAI concorda com a correção do Claude: chamar isso apenas de "drift" é
impreciso; o problema é mais estrutural. O repositório e o histórico oficial de
migrations do Supabase não estão funcionando como um pipeline confiável único.

```
GitHub migration = intenção / documentação / histórico parcial
Supabase produção = estado operacional real
```

Até essa arquitetura ser reconciliada, nenhuma conclusão sobre estado do banco
deve depender exclusivamente dos `.sql` do Git.

## 6. 26 FUNÇÕES `SECURITY DEFINER`

Consulta independente ao banco confirmou novamente 26 funções `SECURITY DEFINER`
com execução acessível ao anônimo. Das 26, a análise do corpo encontrou escrita
em banco em três: `confirmar_recebimento`, `expire_auctions`,
`liberar_saldos_maturados`. As demais analisadas não apresentaram `INSERT`,
`UPDATE` ou `DELETE` em suas definições.

## 7. CORREÇÃO: `aplicar_cupom`

A OpenAI leu a função REAL. `aplicar_cupom` é `STABLE`; consulta a tabela de
cupons; valida regras; calcula desconto; devolve JSON. Ela NÃO incrementa uso e
NÃO altera banco. Qualquer classificação anterior que a tratasse como função de
escrita deve ser removida.

## 8. 17 RPCs USADAS PELO NAVEGADOR

Verificadas diretamente: `aplicar_cupom`, `avaliacao_loja`, `distribuidor_dash`,
`distribuidor_rede`, `distribuidor_vendas`, `distribuidor_vendas_resumo`,
`evolucao_diaria`, `evolucao_vendedores_diaria`, `loja_dash`, `loja_estoque`,
`loja_vitrine`, `marketing_resumo`, `meta_do_usuario`, `painel_atividade`,
`ranking_dia`, `ranking_periodo`, `vendas_auditoria`.

Resultado: **17/17 não possuem verificação de identidade interna** via
`auth.uid()`/equivalente detectado.

IMPORTANTE: isso NÃO significa automaticamente que as 17 são vulnerabilidades.
Precisamos classificar individualmente entre PUBLIC_BY_DESIGN (ex.:
`loja_vitrine`, `aplicar_cupom`, `avaliacao_loja`) e PRIVATE_BY_OBJECT /
PRIVATE_DASHBOARD (ex.: `distribuidor_dash(dist_id)`, `distribuidor_rede(dist_id)`,
`loja_dash(_owner)`, `loja_estoque(_owner,...)`, `meta_do_usuario(uid)`,
`painel_atividade(_owner,...)`, `vendas_auditoria(_owner,...)`). O problema nessas
últimas é potencial IDOR / autorização por objeto, porque o cliente fornece o
identificador do dono. Claude deve separar função pública intencional de função
privada antes de atribuir severidade.

## 9. `find_user_by_phone(text)`

Corpo REAL obtido. A função retorna: `id`, `full_name`, `email`, `role`,
`primary_career_level`, `referral_code`, `commission_balance`, `store_slug`.

Não existe autenticação interna. A comparação telefônica utiliza os 8 últimos dígitos.

**VEREDITO** — achado confirmado e ampliado. Possíveis impactos: enumeração de
usuário; exposição de nome, e-mail, role/cargo, `commission_balance` e ID interno;
possível colisão entre números diferentes com mesmos oito últimos dígitos.
Deve ser tratada como server-only e é candidata prioritária a perder EXECUTE anônimo.

## 10. LISTA DAS 9 RPCs SERVER-ONLY

A lista proposta pelo Claude foi validada independentemente: `busca_estoque`,
`concurso_ranking_periodo`, `confirmar_recebimento`, `expire_auctions`,
`find_user_by_phone`, `liberar_saldos_maturados`, `livoo_ao_vivo_agora`,
`loja_catalogo`, `vendedores_disponiveis`.

No banco REAL, todas possuem atualmente execução por `service_role`,
`authenticated`, `anon` e `PUBLIC`. Busca independente no GitHub não encontrou
dependência direta clara do navegador para essas nove.

**VEREDITO — LISTA DAS 9 VALIDADA PELA OPENAI.** Pode continuar como conjunto
candidato ao futuro Bloco 1. NÃO executar ainda nesta etapa.

## 11. `liberar_saldos_maturados()`

A conclusão anterior permanece. A função possui condição temporal equivalente a
`status = a_liberar` e `release_at <= now()`, e não aparenta permitir ao chamador
escolher arbitrariamente uma venda e antecipar prazo. Entretanto é
`SECURITY DEFINER`, tem finalidade financeira e está aberta ao anônimo sem
necessidade aparente. A severidade deve permanecer abaixo de
`confirmar_recebimento`, mas o EXECUTE anônimo deve ser removido se for server-only.

## 12. TABELAS COM CONFIGURAÇÕES SENSÍVEIS — SOMENTE ESTRUTURA, SEM VALORES

Nenhum token, chave ou valor secreto foi lido ou registrado.

**`melhor_envio_tokens`** — possui colunas com nomes `access_token`,
`refresh_token`. RLS está ligada. Não foi encontrada policy normal de leitura
pública em `pg_policies`. Não há evidência atual de leitura anônima efetiva via RLS.

**`payment_settings`** — colunas incluem `raw_base44`. RLS está ligada, mas existe
policy `public_read` (roles `anon,authenticated`, SELECT, `qual = true`). Também
existem policies para `authenticated` permitindo INSERT, UPDATE e DELETE com
condições amplas. **VEREDITO** — a tabela está publicamente legível para `anon`.
A OpenAI NÃO leu o conteúdo de `raw_base44`; não afirmar ainda que existe segredo
ali, mas a tabela precisa ser classificada imediatamente.

**`wa_config`** — colunas: `owner_id`, `connected`, `ai_global_on`, `ai_prompt`,
`backend_url`, `updated_at`. Existe policy `wcfg_read` (role `public`, SELECT,
`qual = true`). A configuração está publicamente legível. A OpenAI não leu valores.
Claude deve decidir se `ai_prompt` e `backend_url` são realmente dados públicos
por desenho.

## 13. COMMIT SSRF `0ebfebcc`

Implementação revisada. Pontos positivos: o novo porteiro cobre somente
HTTP/HTTPS; loopback; RFC1918; link-local; cloud metadata; CGNAT;
multicast/reservados; IPv6 interno; IP decimal/hexa/octal; domínio interno;
usuário/senha embutidos; redirecionamentos manuais; revalidação de cada salto.
`proxyImage` adiciona validação `image/*`, limite nominal 8 MB e hash para nome
de arquivo. A arquitetura do conserto é boa.

## 14. SSRF — RISCO RESIDUAL ENCONTRADO PELA OPENAI

O helper executa aproximadamente:

```javascript
const buffer = await resposta.arrayBuffer();
if (buffer.byteLength > maxBytes) { ... }
```

Isso significa que quando o servidor remoto não envia `Content-Length`, mente no
`Content-Length`, envia corpo enorme ou envia corpo extremamente lento, o conteúdo
pode ser carregado na memória antes do corte final. Também não foi identificado
timeout explícito com `AbortController`.

**RECOMENDAÇÃO** — hardening posterior: timeout explícito; leitura streaming;
contador incremental de bytes; abortar assim que `maxBytes` for ultrapassado.
Isso não invalida o conserto SSRF atual. É risco residual de DoS/recurso.

## 15. COMMIT DE SESSÃO `17cf1f27`

Infraestrutura de sessão revisada. ETAPA 1: observação — sem crachá válido, log e
`liberado = true`. ETAPA 2: com `SESSAO_MODO=bloquear`, a chamada inválida vira 401.

**VEREDITO** — a arquitetura de rollout é coerente para evitar quebrar telas.
Porém é essencial registrar: enquanto `SESSAO_MODO` não estiver em `bloquear`, o
crachá ainda NÃO representa barreira efetiva de segurança.

## 16. `manageCoupons` — ESTADO REAL DE PRODUÇÃO

A versão existente na branch do Claude ganhou `actorId`, verificação de
admin/super_admin e `exigirSessao()`. Porém a OpenAI verificou diretamente o
arquivo em `main`: a versão de `main` ainda permite `list`, `create`, `toggle` e
`delete` sem validação de ator/admin.

**VEREDITO** — a vulnerabilidade original de `manageCoupons` continua em produção.
O fix está na branch/preview, não no `main` produtivo. Deve permanecer como achado
ativo até merge + deploy autorizados.

## 17. VERCEL — PREVIEW × PRODUÇÃO

Divergência encontrada no handoff anterior. A Vercel possui deployments `READY` da
branch do Claude. Foram observados previews para commits como `17cf1f27`,
`0eb73498` e `3857d16f`. Portanto **DEPLOY PREVIEW = SIM**. Entretanto produção
permanece em `main` / `56efd74b8efbd49f18d16c44b6e26c247622b8f4`.

```
COMMIT CLAUDE ............. SIM
DEPLOY PREVIEW ............ SIM
MERGE PARA MAIN ........... NÃO para estes commits
DEPLOY PRODUÇÃO ........... NÃO
```

Preview automático NÃO deve ser confundido com produção.

## 18. CONFRONTO FINAL DESTA RODADA

**CONCORDÂNCIAS** — Claude e OpenAI concordam que: existem 26 SECURITY DEFINER
abertas; RLS Livoo está desligada; migrations Git não representam de forma
confiável produção; `find_user_by_phone` é exposição séria;
`liberar_saldos_maturados` possui trava temporal; branch do Claude não chegou à
produção; lista de 9 funções server-only é candidata válida para revogação.

**CORREÇÕES NECESSÁRIAS NO HANDOFF CLAUDE**

1. `expire_auctions` — retirar P0 de encerramento antecipado. Existe trava temporal real.
2. `confirmar_recebimento` — manter quebra de autorização; retirar, no estado atual, afirmação de liberação direta de comissão via escrow.
3. Migration 20260716 — registrar como **não instalada em produção** em vez de possível reabertura como hipótese principal.
4. `aplicar_cupom` — registrar que não escreve.
5. 17 RPCs — separar pública por desenho de privada por usuário/owner.
6. Vercel — corrigir: DEPLOY PREVIEW = SIM, DEPLOY PRODUÇÃO = NÃO.
7. SSRF — registrar risco residual: sem timeout explícito; `arrayBuffer` antes do corte final de tamanho.
8. `manageCoupons` — registrar explicitamente: continua vulnerável no main/produção atual.

## 19. RECOMENDAÇÃO DE ORDEM

Antes de qualquer Bloco 1: 1) Claude absorve este retorno; 2) atualiza
`CLAUDE_HANDOFF.md`; 3) resolve qualquer divergência factual restante; 4) publica
novo handoff; 5) OpenAI lê e valida; 6) somente depois pedir autorização do dono
para escrita. Nenhuma alteração em produção deve acontecer enquanto houver
divergência material.

## 20. AÇÃO DO CLAUDE AGORA

Modo: READ_ONLY / HANDOFF ONLY. Confrontar este documento; atualizar
`docs/CLAUDE_HANDOFF.md`; não alterar código, banco ou `main`; não executar
Bloco 1; não fazer deploy; publicar o handoff atualizado automaticamente.
