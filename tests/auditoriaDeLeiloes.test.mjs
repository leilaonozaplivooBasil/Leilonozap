// 🔍 16/09/2026 — O RASTRO DE QUEM MEXE EM LEILÃO.
//
// Em 15/09 às 11:08 BRT o leilão do PS5 — ativo, no banner, terminando em 29/09 —
// apareceu com vencedor gravado. Preço igual ao inicial, version = 1, end_time
// nunca esticado, zero lances no histórico, e o "vencedor" nunca deu lance em
// leilão nenhum. Nenhum caminho do app grava vencedor mantendo status='active'.
// UMA linha tocada naquele minuto. Foi escrita manual, fora da aplicação — e não
// deixou rastro: nem log, nem autoria, nem raw_base44.
//
// Este teste guarda as promessas do gatilho que fecha esse buraco. O que ele NÃO
// faz é rodar SQL: a migração foi aplicada e conferida em produção (inclusive o
// teste de quebrar a auditoria de propósito). Aqui o que se protege é que
// ninguém desfaça as garantias editando o arquivo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SQL = readFileSync(
  new URL('../supabase/migrations/20260916120433_auditoria_de_leiloes.sql', import.meta.url), 'utf8'
);
// 🔴 os comentários deste arquivo CITAM os mesmos nomes que o código usa
// ('request.headers', 'current_user'). Asserção contra o arquivo inteiro casa com
// o comentário e deixa passar a mutação — foi o que aconteceu na primeira rodada.
const CODIGO = SQL.replace(/^\s*--.*$/gm, '');
// o bloco que de fato grava o rastro
const VALUES = (() => {
  const i = CODIGO.indexOf('insert into public.auction_auditoria');
  return CODIGO.slice(i, CODIGO.indexOf(');', i));
})();

test('🔴 a auditoria NUNCA derruba a escrita do leilão', () => {
  // gatilho no caminho do dinheiro que estoura é pior que o problema que resolve
  assert.match(SQL, /exception when others then/i);
  const iExc = SQL.toLowerCase().lastIndexOf('exception when others then');
  const iFim = SQL.toLowerCase().indexOf('$$;', iExc);
  assert.ok(iExc > 0 && iFim > iExc, 'o tratamento de erro final sumiu');
  assert.match(SQL.slice(iExc, iFim), /return null;/, 'o catch deixou de engolir a falha');
  // e o insert está DEPOIS do begin que tem esse catch
  assert.ok(SQL.indexOf('insert into public.auction_auditoria') < iExc,
    'a gravação saiu de dentro do bloco protegido');
});

test('o gatilho cobre as três operações — apagar um leilão também é rastro', () => {
  assert.match(SQL, /after insert or update or delete on public\.auctions/i);
  assert.match(SQL, /for each row execute function public\.registrar_auditoria_de_leilao\(\)/i);
});

test('🔒 os campos vigiados são os que decidem dinheiro e disputa', () => {
  for (const campo of ['winner_id', 'winner_name', 'current_price', 'starting_price', 'end_time', 'status']) {
    assert.match(SQL, new RegExp(`new\\.${campo}\\s+is distinct from old\\.${campo}`),
      `${campo} saiu da vigilância`);
  }
});

test('mudança que não interessa não gera linha — senão a tabela esconde o que importa', () => {
  assert.match(SQL, /if v_mud = '\{\}'::jsonb then return null; end if;/);
});

test('🔴 registra QUEM: é `papel_pg` que separa o app do painel do Supabase', () => {
  // authenticated/anon = app · service_role = função nossa · postgres = painel ou
  // conexão direta, que é a assinatura exata da escrita de 15/09
  assert.match(CODIGO, /papel_pg\s+text\s+not null default current_user/i);
  // 🔴 dentro do INSERT, não em qualquer lugar do arquivo: a própria coluna é
  // declarada com `default current_user,` e casava com a asserção antiga
  assert.match(VALUES, /\bcurrent_user\b/, 'o gatilho parou de gravar QUEM escreveu');
  assert.match(VALUES, /v_claims ->> 'sub'/, 'parou de gravar o usuário do JWT');
  assert.match(VALUES, /'user-agent'/, 'parou de gravar o user-agent');
  assert.match(CODIGO, /request\.jwt\.claims/);
});

test('ler as variáveis do PostgREST não pode quebrar o gatilho', () => {
  // fora do PostgREST elas nem existem; `true` é o missing_ok
  // no CÓDIGO, não no comentário que explica o mecanismo
  assert.match(CODIGO, /current_setting\('request\.headers', true\)/);
  assert.match(CODIGO, /current_setting\('request\.jwt\.claims', true\)/);
  // e cada leitura tem o próprio catch
  const trecho = CODIGO.slice(CODIGO.indexOf('v_cab'), CODIGO.indexOf('insert into public.auction_auditoria'));
  assert.ok((trecho.match(/exception when others then/gi) || []).length >= 2,
    'as leituras de contexto perderam a proteção individual');
});

test('🔒 o auditado não lê nem apaga a própria auditoria', () => {
  assert.match(SQL, /alter table public\.auction_auditoria enable row level security/i);
  assert.match(SQL, /revoke all on public\.auction_auditoria from anon, authenticated/i);
  assert.match(SQL, /revoke all on sequence public\.auction_auditoria_id_seq from anon, authenticated/i);
  // e nenhuma policy devolve leitura pra quem quer que seja
  assert.ok(!/create policy/i.test(SQL), 'apareceu policy dando acesso à auditoria');
});

test('grava mesmo quando quem escreveu não teria permissão', () => {
  assert.match(SQL, /security definer/i);
  // search_path preso: security definer sem isso é porta de entrada
  assert.match(SQL, /set search_path = public, pg_catalog/i);
});

test('o arquivo bate com a versão que o banco registrou', () => {
  // arquivo e registro 1:1 — é o que a PR #334 consertou
  assert.match(SQL, /20260916120433/, 'o arquivo não cita a versão registrada');
});

test('a auditoria é append-only na prática — sem update nem delete embutidos', () => {
  const corpo = SQL.slice(SQL.indexOf('create or replace function'));
  assert.ok(!/update public\.auction_auditoria|delete from public\.auction_auditoria/i.test(corpo),
    'o gatilho passou a poder reescrever o próprio rastro');
});
