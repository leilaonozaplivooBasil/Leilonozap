---
name: antes-de-mesclar
description: Conferência obrigatória antes de mesclar PR, publicar ramo, aplicar migração ou rodar qualquer SQL na produção deste projeto. Cruza o ramo atual com os outros ramos claude/* publicados, compara as migrações registradas no banco com os arquivos do repositório, e obriga a avisar as outras frentes. Use SEMPRE antes de merge, push de ramo, apply_migration, execute_sql com DDL, ou mudança de política/privilégio no Supabase — e também quando o dono pedir para "conferir colisão", "ver se bate com o banco" ou "avisar o outro chat".
---

# Antes de mesclar

## Por que isto existe

Em **15/09/2026** três migrações foram aplicadas na produção por outro chat, sem
arquivo neste repositório. Uma delas, `auditoria_app_users_colunas_publicas`,
rodou `revoke all on table public.app_users from anon` e devolveu o acesso coluna
a coluna.

O `plataformaAdapter` lê com `select('*')`. E `select *` **não passa** em tabela
com privilégio por coluna — o banco responde `42501 permission denied`.

**Resultado: o login por e-mail caiu em produção**, e a pessoa que tentava entrar
lia *"Erro de conexão. Verifique sua internet"*.

A mudança era um conserto de segurança legítimo. Ninguém agiu de má-fé. O que
faltou foi conferir **quem mais lê aquela tabela** antes de fechar a porta — e um
lugar onde desse pra ver que duas frentes mexiam na mesma coisa.

Esta conferência existe para que isso não aconteça de novo.

---

## Passo 1 — Quem mais está nos meus arquivos

```bash
npm run colisao
```

Cruza os arquivos do ramo atual com os de **todo ramo `claude/*` publicado**.

- **Achou colisão** → anote o nome dos ramos e os arquivos. Eles entram no aviso
  do passo 4. Se o arquivo em comum for de caminho de venda, pagamento ou
  autenticação, **pare e pergunte ao dono** antes de seguir.
- **Não achou** → siga, mas o passo 4 continua valendo. O script enxerga git, não
  o banco.

> Ramo publicado **sem PR aberto** é o caso mais perigoso: é trabalho real que só
> aparece na hora do conflito. Trate igual a um PR aberto.

## Passo 2 — O banco bate com o repositório?

Só quando o passo envolver SQL, migração, política ou privilégio.

Liste o que o banco registrou (MCP do Supabase, projeto `gezvviyegtxytnwjkrjv`):

```sql
select version, name from supabase_migrations.schema_migrations
order by version desc limit 15;
```

E compare com os arquivos:

```bash
ls supabase/migrations/*.sql | xargs -n1 basename
```

- **Registro sem arquivo aqui** → outra frente mexeu no banco. **Pare.** Leia o
  SQL antes de qualquer coisa:
  ```sql
  select left(statements[1], 4000) from supabase_migrations.schema_migrations
  where version = '<a versão órfã>';
  ```
  Depois avise o dono com o que a migração faz e quem ela afeta.
- **Arquivo sem registro** → a migração nunca rodou. Não presuma que rodou só
  porque o PR foi mesclado: o workflow quebra no `supabase link` enquanto o
  `SUPABASE_ACCESS_TOKEN` estiver morto.

## Passo 3 — Mudança de privilégio: quem lê essa tabela?

Fazer `revoke`, `grant`, mexer em RLS ou em política de Storage **obriga** a esta
pergunta antes: *o navegador lê essa tabela, e como?*

```bash
grep -rn "from('<tabela>')" src/ | head -30
grep -n "select('\*')" src/api/plataformaAdapter.js
```

O navegador desta plataforma fala com o Supabase como **`anon`** (o login não é o
Supabase Auth). E o adapter lê com `select('*')` — então **privilégio por coluna
quebra toda leitura pela entidade**, não só a da coluna escondida.

Teste antes de aplicar, no próprio banco, sem alterar nada:

```sql
create or replace function pg_temp.teste_anon()
returns table(caso text, resultado text) language plpgsql as $$
declare r record;
begin
  set local role anon;
  caso := 'select *';
  begin execute 'select * from public.<tabela> limit 1' into r; resultado := 'PASSOU';
  exception when others then resultado := 'FALHOU: '||SQLSTATE||' '||SQLERRM; end;
  return next;
  reset role;
end $$;
select * from pg_temp.teste_anon();
```

Se `select *` falhar, o site quebra. Sem exceção.

## Passo 4 — Avisar as outras frentes

**Este passo não tem atalho, e não depende do que os passos anteriores acharam.**

Diga ao dono, com estas palavras:

> Avise o outro chat: ramo `<nome>`, arquivos em comum `<lista>`.
> (E, se houve SQL: migração `<versão>` aplicada no banco.)

O checklist do `.github/pull_request_template.md` cobra o mesmo em todo PR.

## Passo 5 — Aplicou SQL pela API de gestão? Renomeie o arquivo

A API de gestão carimba a versão com a **hora da aplicação**, não com o nome do
arquivo. Renomeie o arquivo do repositório para o número que o banco registrou:

```bash
git mv supabase/migrations/<numero_do_arquivo>_nome.sql \
       supabase/migrations/<numero_registrado>_nome.sql
```

Arquivo e registro **1:1** foi o que a PR #334 consertou. Deixar os dois com
números diferentes recria o problema.

## Passo 6 — Depois de mesclar

Avise de novo, com o número do PR. Quem estiver com ramo antigo precisa trazer o
`main` antes de continuar, senão o conflito só aparece no fim.

---

## Nunca

- **Aplicar SQL na produção sem o arquivo correspondente no repositório.** Foi
  exatamente isto que tirou o login do ar, e o git não enxerga.
- **Desfazer conserto de segurança de outra frente sem falar com o dono.**
  Levante o problema, proponha as saídas, e deixe a escolha com ele.
- **Mesclar PR que toca arquivo 🔴 do `.coderabbit.yaml`** sem autorização
  explícita e escrita (regra do `CLAUDE.md`).

## Lembretes do projeto

- Janela de deploy: **01h00–02h15 BRT**. Exceções: produção quebrada, dinheiro
  parado, dado exposto, canal de migração travado.
- Leilão que já está no ar não se altera.
- A ordem com o dono é sempre: **análise → preview → ok dele → executar**.
