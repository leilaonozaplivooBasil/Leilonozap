// 🗳️ 09/09/2026 — dono, olhando a lista de participantes do ADM X-Game:
// "tem pessoas que vão receber valor na gamificação, já participaram da
// mentoria e não vão receber voto... eles podem votar, mas não recebem
// voto... e eu não tenho esse botão." Este arquivo prova que o botão
// existe: o admin pode desligar `aceita_ser_votado` pessoa por pessoa,
// sem mexer em `ativo` (continua paga/gamificada) nem em quem ELA pode
// votar (isso nunca dependeu de receber voto).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { podeSerVotado } from '../src/lib/xgame.js';

const ADMIN = fs.readFileSync(new URL('../src/components/licensing/XGameAdmin.jsx', import.meta.url), 'utf8');

test('podeSerVotado: o admin desliga um participante comum sem afetar quem é Super Admin', () => {
  // caso do dono: um diretor que já passou pela mentoria, mas o dono não
  // quer que ele receba voto — continua podendo votar nos outros à vontade.
  assert.equal(podeSerVotado({ role: 'diretor', aceita_ser_votado: false }), false);
  assert.equal(podeSerVotado({ role: 'executivo', aceita_ser_votado: false }), false);
  // ninguém mexeu — continua exatamente como sempre foi (opt-out, não opt-in)
  assert.equal(podeSerVotado({ role: 'diretor' }), true);
});

test('XGameAdmin.jsx: existe um botão que liga/desliga "recebe voto" por pessoa, separado da mentoria/ativo', () => {
  assert.match(ADMIN, /salvarParticipante\(p, \{ aceita_ser_votado: recebeVoto \? false : true \}\)/, 'o botão precisa gravar aceita_ser_votado, o MESMO campo que podeSerVotado lê');
  assert.match(ADMIN, /const recebeVoto = podeSerVotado\(\{ role: usu\?\.role, aceita_ser_votado: p\.aceita_ser_votado \}\)/, 'o estado do botão vem da MESMA função pura que decide quem é votável de verdade — nunca duplicado à mão');
});

test('XGameAdmin.jsx: o botão só aparece pra quem NÃO é Super Admin — ele já tem o próprio interruptor (opt-in) no X-GAME dele', () => {
  const inicioBotao = ADMIN.indexOf('{ehParticipanteComum && (');
  assert.ok(inicioBotao >= 0, 'o botão precisa estar condicionado a ehParticipanteComum');
  assert.match(ADMIN, /const ehParticipanteComum = usu\?\.role !== 'super_admin'/);
});

test('XGameAdmin.jsx: não mexe em `ativo` nem em quem a pessoa PODE votar — só em quem RECEBE voto', () => {
  const inicioBotao = ADMIN.indexOf('onClick={() => salvarParticipante(p, { aceita_ser_votado: recebeVoto');
  const trecho = ADMIN.slice(inicioBotao, inicioBotao + 300);
  assert.doesNotMatch(trecho, /ativo:/, 'desligar o voto não pode desativar a pessoa do jogo/pagamento');
});

test('XGameAdmin.jsx: o cabeçalho do card avisa quando alguém comum está sem receber voto — não fica escondido só no botão', () => {
  assert.match(ADMIN, /ehParticipanteComum && !recebeVoto && <span[^>]*>🗳️ não recebe voto<\/span>/);
});

// 🚫 DIR-122 (09/09/2026) — dono, depois de eu unificar a conta duplicada
// de Joao Vitor Paim Pereira na conta pessoal dele: "mas ele não pode
// ganhar duas vezes... eu só escolhi uma conta no painel admin." A conta
// duplicada (login auto-gerado, sem atividade) continua existindo — sem
// esta trava, ela reaparecia na lista de "adicionar participante" e podia
// ser escolhida de novo por engano, recriando a mesma confusão.
test('XGameAdmin.jsx: a conta duplicada de Joao Vitor Paim Pereira nunca mais aparece pra ser escolhida como participante', () => {
  assert.match(ADMIN, /IDS_DUPLICADOS_FORA_DO_XGAME = new Set\(\['e90ed56209c71d4bf4dd3bc3'\]\)/, 'a lista de exclusão precisa existir e conter o id exato da conta duplicada');
  const inicioCandidatos = ADMIN.indexOf('const candidatos = useMemo(');
  const trechoCandidatos = ADMIN.slice(inicioCandidatos, inicioCandidatos + 300);
  assert.match(trechoCandidatos, /!IDS_DUPLICADOS_FORA_DO_XGAME\.has\(u\.id\)/, 'a lista de candidatos a virar participante precisa filtrar a conta duplicada');
  const inicioContagem = ADMIN.indexOf('const contagemPorGrupo = useMemo(');
  const trechoContagem = ADMIN.slice(inicioContagem, inicioContagem + 300);
  assert.match(trechoContagem, /!IDS_DUPLICADOS_FORA_DO_XGAME\.has\(u\.id\)/, 'a contagem por grupo (o número ao lado de cada filtro) também não pode contar a conta duplicada');
});

test('DICAS.recebeVoto explica que ativo/mentoria/poder-votar continuam intocados', () => {
  const inicio = ADMIN.indexOf('recebeVoto:');
  assert.ok(inicio >= 0);
  const dica = ADMIN.slice(inicio, inicio + 400);
  assert.match(dica, /continua podendo VOTAR/i);
  assert.match(dica, /continua ATIVA/i);
  assert.match(dica, /continua recebendo o fixo/i);
});
