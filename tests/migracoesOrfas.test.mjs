// 🧱 MIGRAÇÃO ÓRFÃ — a versão que está no banco e não tem arquivo (09/09/2026).
//
// É o defeito mais caro deste projeto e já travou o deploy DUAS VEZES em dois
// dias. Aplicar migração pelo painel ou pelo MCP grava a versão em
// `supabase_migrations.schema_migrations` mas NÃO cria o arquivo. A partir daí,
// todo `supabase db push --include-all` falha com
//
//     Remote migration versions not found in local migrations directory
//
// e NENHUMA migração de NINGUÉM entra em produção até alguém perceber. O app
// continua deployando normal pelo Vercel — só o banco fica para trás, calado.
//
// 🔴 E A ARMADILHA QUE PEGOU O CONSERTO ANTERIOR: criar o mesmo SQL com um
// timestamp NOVO não adota a versão antiga. A órfã continua órfã, e agora existe
// também um arquivo pendente a mais. Foi o que aconteceu de manhã: 3 órfãs
// viraram 3 arquivos novos e 3 órfãs — o canal seguiu travado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = new URL('../supabase/migrations/', import.meta.url);
const arquivos = readdirSync(DIR).filter((f) => f.endsWith('.sql'));
const versoes = new Set(arquivos.map((f) => f.split('_')[0]));
const ler = (f) => readFileSync(new URL(f, DIR), 'utf8');

// As versões que o banco de produção tinha registradas SEM arquivo em 09/09.
// Conferidas em supabase_migrations.schema_migrations antes de recuperar.
const ORFAS_RECUPERADAS = {
  '20260909011958': 'perdao_zeragem',
  '20260909034253': 'script_contato_pontuado',
  '20260909082446': 'metodo_tarefas_unique_user_data_hora_titulo',
};

test('🔴 as versões órfãs de 09/09 têm arquivo — com a versão DO BANCO', () => {
  for (const [versao, nome] of Object.entries(ORFAS_RECUPERADAS)) {
    assert.ok(versoes.has(versao),
      `${versao} (${nome}) voltou a ser órfã — o deploy de migrações trava inteiro no próximo push`);
  }
});

test('o arquivo recuperado diz que foi recuperado, e ensina a não repetir', () => {
  for (const versao of Object.keys(ORFAS_RECUPERADAS)) {
    const f = arquivos.find((x) => x.startsWith(versao));
    const sql = ler(f);
    assert.match(sql, /RECUPERADO DO BANCO/, `${f}: sem o aviso, alguém apaga achando que é lixo`);
    assert.match(sql, /timestamp NOVO não resolve|timestamp NOVO nao resolve/,
      `${f}: precisa ensinar por que criar outro timestamp não conserta`);
  }
});

test('🔴 ADD CONSTRAINT sem guarda derruba o deploy no primeiro push', () => {
  // `ADD CONSTRAINT` não aceita IF NOT EXISTS no Postgres. Um arquivo desses
  // rodando contra um banco que JÁ TEM a constraint falha com 42710 — e trava o
  // canal de novo, logo depois de destravado.
  //
  // Foi o que ia acontecer com o 20260909210000: a mesma constraint já tinha
  // sido aplicada às 08h24, e o arquivo pendente iria falhar no primeiro push
  // depois do conserto. Um travamento consertando o travamento.
  //
  // ⚠️ O RECORTE É O TESTE. Migração já aplicada nunca roda de novo neste banco;
  // reescrever histórico antigo seria mexer em cima do que já deu certo, por
  // nada. A regra vale do corte pra frente — pro que ainda vai rodar.
  const CORTE = '20260909200000';
  const semGuarda = arquivos.filter((f) => {
    if (f.split('_')[0] < CORTE) return false;          // já aplicada, não roda mais
    const sql = ler(f).toLowerCase();
    if (!/add\s+constraint/.test(sql)) return false;
    return !/pg_constraint/.test(sql);
  });
  assert.deepEqual(semGuarda, [],
    `ADD CONSTRAINT sem checar pg_constraint antes — vai falhar com 42710: ${semGuarda.join(', ')}`);
});

test('e o arquivo que ia derrubar o deploy está guardado', () => {
  const f = arquivos.find((x) => x.startsWith('20260909210000'));
  assert.ok(f, 'sumiu a migração pendente da constraint');
  const sql = ler(f);
  assert.match(sql, /if not exists \(\s*select 1 from pg_constraint/i);
  assert.match(sql, /42710/, 'o arquivo precisa explicar o erro que ele evita');
});
