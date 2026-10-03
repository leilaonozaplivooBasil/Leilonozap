// 🎂 DIR-194 — DATA DE NASCIMENTO OPCIONAL NO CADASTRO (03/10/2026)
// Dono: "pode colocar a data de nascimento no cadastro, mas sem ferir, sem
// restringir e sem criar ainda mais bloqueio na entrada — bem leve". Estes
// testes travam exatamente isso: o campo existe em todo cadastro e no perfil,
// é opcional em todos, o que não é data vira null (nunca recusa), o servidor é
// quem grava, a coluna fica fora da lista pública e o painel só vê contagem.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { mascaraData, nascimentoISO, nascimentoBR, idadeDe } from '../src/lib/dataDeNascimento.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const HOJE = new Date(Date.UTC(2026, 9, 3)); // 03/10/2026

test('a máscara só formata (dd/mm/aaaa) e nunca recusa tecla', () => {
  assert.equal(mascaraData('1'), '1');
  assert.equal(mascaraData('1203'), '12/03');
  assert.equal(mascaraData('12031990'), '12/03/1990');
  assert.equal(mascaraData('12/03/1990x9'), '12/03/1990');
  assert.equal(mascaraData(''), '');
});

test('nascimentoISO: data plausível vira AAAA-MM-DD; tudo o mais vira null, sem lançar erro', () => {
  assert.equal(nascimentoISO('12/03/1990', HOJE), '1990-03-12');
  assert.equal(nascimentoISO('12031990', HOJE), '1990-03-12');
  assert.equal(nascimentoISO('1990-03-12', HOJE), '1990-03-12');
  assert.equal(nascimentoISO('29/02/2000', HOJE), '2000-02-29', 'bissexto');
  assert.equal(nascimentoISO('29/02/2001', HOJE), null, 'não bissexto');
  assert.equal(nascimentoISO('31/04/1990', HOJE), null);
  assert.equal(nascimentoISO('12/03/19', HOJE), null, 'incompleto');
  assert.equal(nascimentoISO('04/10/2026', HOJE), null, 'amanhã');
  assert.equal(nascimentoISO('03/10/2026', HOJE), '2026-10-03', 'hoje passa');
  assert.equal(nascimentoISO('01/01/1850', HOJE), null, 'mais de 120 anos');
  assert.equal(nascimentoISO('', HOJE), null);
  assert.equal(nascimentoISO(null, HOJE), null);
  assert.equal(nascimentoISO(undefined, HOJE), null);
  assert.equal(nascimentoISO({ a: 1 }, HOJE), null);
  assert.equal(nascimentoISO('abc', HOJE), null);
});

test('nascimentoBR e idadeDe', () => {
  assert.equal(nascimentoBR('1990-03-12'), '12/03/1990');
  assert.equal(nascimentoBR(null), '');
  assert.equal(idadeDe('1990-03-12', HOJE), 36);
  assert.equal(idadeDe('1990-10-04', HOJE), 35, 'faz aniversário amanhã');
  assert.equal(idadeDe('1990-10-03', HOJE), 36, 'aniversário hoje');
  assert.equal(idadeDe('', HOJE), null);
});

test('os três formulários de cadastro têm o campo, marcado como opcional, mascarado, e mandam birth_date pela régua', () => {
  const C = ler('../src/pages/Cadastro.jsx');
  assert.ok(C.includes('placeholder="Nascimento (opcional) dd/mm/aaaa"'));
  assert.ok(C.includes('nascimento: mascaraData(v)'));
  assert.ok(C.includes('birth_date: nascimentoISO(form.nascimento)'));
  const G = ler('../src/components/common/GuestRegistrationModal.jsx');
  assert.ok(G.includes('Data de nascimento <span className="text-gray-500 font-normal">(opcional)</span>'));
  assert.ok(G.includes('setNascimento(mascaraData(e.target.value))'));
  assert.ok(G.includes('birth_date: nascimentoISO(nascimento)'));
  const R = ler('../src/pages/Register.jsx');
  assert.ok(R.includes('Data de nascimento <span className="opacity-60 font-normal">(opcional)</span>'));
  assert.ok(R.includes('setNascimento(mascaraData(e.target.value))'));
  assert.ok(R.includes('birth_date: nascimentoISO(nascimento)'));
});

test('nenhum formulário recusa o cadastro por causa da data: não há mensagem de erro que fale de nascimento', () => {
  for (const p of ['../src/pages/Cadastro.jsx', '../src/components/common/GuestRegistrationModal.jsx', '../src/pages/Register.jsx']) {
    const F = ler(p);
    for (const m of F.matchAll(/(toast\.error|setErrorMessage)\(([^)]*)\)/g)) {
      assert.ok(!/nascimento|birth/i.test(m[2]), `${p}: recusa por data de nascimento: ${m[0].slice(0, 80)}`);
    }
    assert.ok(!/if \(!nascimento\)|if \(!form\.nascimento\)|required[^\n]*nascimento/.test(F), `${p}: campo obrigatório`);
  }
});

test('o perfil mostra e edita a data (opcional), lê do cache do servidor e converte antes de salvar', () => {
  const P = ler('../src/pages/Profile.jsx');
  assert.ok(P.includes("birth_date: nascimentoBR(user.birth_date)"));
  assert.ok(P.includes("birth_date: usersInDB[0].birth_date ?? localUser.birth_date ?? null"), 'a coluna não está na lista pública: vem do servidor');
  assert.ok(P.includes("if ('birth_date' in finalData) finalData.birth_date = nascimentoISO(finalData.birth_date);"));
  assert.ok(P.includes('<InfoTile icon={CalendarDays} label="Data de nascimento" value={nascimentoBR(currentUser.birth_date) || \'Não informada\'} />'));
  assert.ok(P.includes('Data de nascimento <span className="opacity-60 font-normal">(opcional)</span>'));
});

test('o servidor é quem grava, sempre pela régua única: cadastro público, cadastro da rede, meu cadastro e admin', () => {
  for (const p of ['../api/functions/publicRegister.js', '../api/functions/registerNetworkUser.js']) {
    const F = ler(p);
    assert.ok(F.includes("import { nascimentoISO } from '../../src/lib/dataDeNascimento.js';"), p);
    assert.ok(F.includes('birth_date: nascimentoISO(body?.birth_date),'), p);
    assert.ok(!/birth_date[^\n]*status\(400\)|status\(400\)[^\n]*birth_date/.test(F), `${p}: a rota nunca recusa por data`);
  }
  const M = ler('../api/functions/atualizarMeuCadastro.js');
  const lista = M.slice(M.indexOf('const MEUS_CAMPOS'), M.indexOf('];', M.indexOf('const MEUS_CAMPOS')));
  assert.ok(lista.includes("'birth_date'"));
  assert.ok(M.includes("if ('birth_date' in mudancas) mudancas.birth_date = nascimentoISO(mudancas.birth_date);"));
  const A = ler('../api/functions/adminUpdateUser.js');
  const allowed = A.slice(A.indexOf('const ALLOWED'), A.indexOf('];', A.indexOf('const ALLOWED')));
  assert.ok(allowed.includes("'birth_date'"), 'admin editando o próprio perfil passa pelo adminUpdateUser');
  assert.ok(A.includes("if ('birth_date' in payload) payload.birth_date = nascimentoISO(payload.birth_date);"));
});

test('a coluna nasce nula, sem check, e fica FORA da lista pública de colunas (dado pessoal)', () => {
  const SQL = readFileSync(new URL('../supabase/migrations/20261003180000_data_de_nascimento_opcional.sql', import.meta.url), 'utf8');
  assert.ok(SQL.includes('add column if not exists birth_date date;'));
  const alter = SQL.slice(SQL.indexOf('alter table public.app_users'), SQL.indexOf(';', SQL.indexOf('alter table public.app_users')));
  assert.ok(!/not null|default|check/i.test(alter), 'sem not null, sem default, sem check');
  assert.ok(!/grant select[^;]*birth_date/i.test(SQL), 'fora do grant do anônimo');
  const adapter = readFileSync(new URL('../src/api/plataformaAdapter.js', import.meta.url), 'utf8');
  const m = adapter.match(/const COLUNAS_PUBLICAS_APP_USERS = '([^']+)';/);
  assert.ok(!m[1].split(',').includes('birth_date'));
});

test('o painel do investidor conta por faixa e nunca inventa idade', () => {
  const SQL = readFileSync(new URL('../supabase/migrations/20261003180000_data_de_nascimento_opcional.sql', import.meta.url), 'utf8');
  assert.ok(SQL.includes('create or replace function public.painel_investidor_perfil(_dias integer default 30)'));
  assert.ok(SQL.includes("extract(year from age(_hoje, birth_date))::int as anos"));
  assert.ok(SQL.includes("unnest(array['ate_17','18_24','25_34','35_44','45_54','55_64','65_mais'])"));
  assert.ok(SQL.includes("return jsonb_build_object('genero', genero, 'canais', canais, 'idade', idade);"));
  assert.ok(SQL.includes('revoke all on function public.painel_investidor_perfil(integer) from public, anon, authenticated;'));
  const Pg = ler('../src/pages/PainelInvestidor.jsx');
  assert.ok(Pg.includes("const FAIXAS = { ate_17: 'até 17'"));
  assert.ok(Pg.includes('<Pie data={fatiasIdade}'));
  assert.ok(Pg.includes('Ninguém informou a data de nascimento ainda.'));
});
