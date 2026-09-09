// 🧱 AS DUAS MIGRAÇÕES IRMÃS — o arquivo que parece lixo e não é (09/09/2026).
//
// Item 6 da lista do dono ("dívidas pequenas") trazia "migração duplicada" como
// coisa pra limpar. CONFERIDO NO BANCO ANTES DE MEXER: as DUAS versões estão
// registradas em supabase_migrations.schema_migrations. Apagar qualquer um dos
// dois arquivos faz o `supabase db push --include-all` do deploy falhar com
// "Remote migration versions not found in local migrations directory" — e a
// partir daí nenhuma migração nova entra em produção até alguém perceber. Foi o
// que travou o deploy por horas em 08/09 (PR #248).
//
// Este teste existe pra que a próxima pessoa (ou o próximo eu) que abrir a pasta
// e vir dois arquivos com o mesmo nome não "limpe" o deploy inteiro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = new URL('../supabase/migrations/', import.meta.url);
const arquivos = readdirSync(DIR);

test('🔴 as duas migrações de `em_mentoria` continuam no repositório', () => {
  for (const versao of ['20260908221200', '20260908223124']) {
    assert.ok(arquivos.some((f) => f.startsWith(versao)), `sumiu a migração ${versao} — o deploy de migrações trava no próximo push`);
  }
});

test('o arquivo que parece duplicado avisa, em cima, por que não pode sumir', () => {
  const f = arquivos.find((x) => x.startsWith('20260908221200'));
  const sql = readFileSync(new URL(f, DIR), 'utf8');
  assert.match(sql.slice(0, 400), /NÃO APAGUE/, 'sem o aviso no topo, alguém apaga achando que está limpando');
  assert.match(sql, /schema_migrations/, 'o aviso precisa dizer ONDE conferir, não só "não apague"');
});

test('as duas são idempotentes — rodar as duas não custa nada', () => {
  // É isto que torna a duplicata inofensiva, e por isso ela pode ficar.
  for (const versao of ['20260908221200', '20260908223124']) {
    const f = arquivos.find((x) => x.startsWith(versao));
    const sql = readFileSync(new URL(f, DIR), 'utf8');
    assert.match(sql, /add column if not exists/i, `${versao} deixou de ser idempotente — aí a duplicata passa a doer`);
  }
});
