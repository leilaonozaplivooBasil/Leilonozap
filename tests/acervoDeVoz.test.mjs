// 🎙️ ACERVO DE VOZ — a gravação fica 1 mês, e a pessoa pode levar embora antes
// (DIR-104, 09/09/2026).
//
// Dono: "Faz sentido, mas inclua opção de download e aviso de que só permanece
// salvo por 1 mês."
//
// ⚠️ O QUE ESTES TESTES PROTEGEM DE VERDADE: aqui se apaga a VOZ de alguém
// dizendo pelo que era grato. O perigo não é o botão quebrar — é a tela dizer
// "some em 3 dias" e o cron apagar hoje. Por isso a régua é UMA SÓ, e é ela que
// está sob teste dos dois lados.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  RETENCAO_AUDIO_DIAS, diasDeVida, diasQueRestam, audioExpirado,
  avisoDeRetencao, retaFinal, nomeDoArquivo, linkParaBaixar,
} from '../src/lib/acervoDeVoz.js';
import { entradaDe } from '../src/lib/diarioDeBolso.js';
import { comprovacaoSemAudio } from '../api/functions/purgarAudiosAntigos.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CRON = semComentarios(ler('../api/functions/purgarAudiosAntigos.js'));
const PECA = semComentarios(ler('../src/components/common/OuvirGratidao.jsx'));
const DIARIO = semComentarios(ler('../src/components/licensing/CentralVendas/DiarioDeBolso.jsx'));
const VERCEL = JSON.parse(ler('../vercel.json'));

const HOJE = new Date('2026-09-09T12:00:00');

test('1 mês é 30 dias — e o prazo conta do dia da gravação', () => {
  assert.equal(RETENCAO_AUDIO_DIAS, 30);
  assert.equal(diasDeVida('2026-09-09', HOJE), 0, 'gravado hoje');
  assert.equal(diasDeVida('2026-08-10', HOJE), 30);
  assert.equal(diasQueRestam('2026-09-09', HOJE), 30);
  assert.equal(diasQueRestam('2026-09-08', HOJE), 29);
  assert.equal(diasQueRestam('2026-01-01', HOJE), 0, 'nunca negativo: "acabou" é acabou');
});

test('🔴 O DIA DO CORTE É EXATO — no 29 ainda vive, no 30 vai embora', () => {
  // O limite é onde o erro machuca: um dia a mais na conta apaga a gravação de
  // quem a tela ainda mandava esperar.
  assert.equal(audioExpirado('2026-08-12', HOJE), false, '28 dias: vive');
  assert.equal(audioExpirado('2026-08-11', HOJE), false, '29 dias: vive');
  assert.equal(audioExpirado('2026-08-10', HOJE), true, '30 dias: vai');
  assert.equal(audioExpirado('2026-08-09', HOJE), true, '31 dias: vai');
});

test('🔴 DATA RUIM NÃO AUTORIZA APAGAR NADA', () => {
  // Na dúvida o arquivo FICA. O contrário — data ilegível virando "expirado" —
  // seria uma faxina que come gravação boa sem ninguém entender por quê.
  for (const ruim of [null, undefined, '', 'ontem', '00-00-0000', {}]) {
    assert.equal(audioExpirado(ruim, HOJE), false, `${JSON.stringify(ruim)} não pode autorizar remoção`);
  }
  assert.equal(diasDeVida('nada disso', HOJE), null);
  assert.equal(diasQueRestam('nada disso', HOJE), null);
});

test('o aviso fala português e vira urgência na reta final', () => {
  assert.match(avisoDeRetencao('2026-09-09', HOJE), /guardado por 30 dias/);
  assert.match(avisoDeRetencao('2026-09-09', HOJE), /baixe pra guardar pra sempre/, 'o aviso tem que dizer a SAÍDA, não só o prazo');
  assert.match(avisoDeRetencao('2026-08-09', HOJE), /já foi apagada/);
  assert.match(avisoDeRetencao('2026-08-11', HOJE), /some amanhã/, '1 dia restante fala como gente');
  assert.match(avisoDeRetencao('2026-08-13', HOJE), /some em 3 dias/);

  assert.equal(retaFinal('2026-08-13', HOJE), true, '3 dias = âmbar');
  assert.equal(retaFinal('2026-09-09', HOJE), false, '30 dias = cinza');
  assert.equal(retaFinal('2026-01-01', HOJE), false, 'já apagado não é "reta final"');
});

test('o arquivo baixado chega com nome que quer dizer alguma coisa', () => {
  // Ele vai viver no computador da pessoa pra sempre, longe daqui: o nome é a
  // única pista que sobra de que aquilo era a gratidão daquele dia.
  assert.equal(nomeDoArquivo('xgame/gratidao/u1/2026-09-09_t3_x9.webm', '2026-09-09'), 'gratidao-2026-09-09.webm');
  assert.equal(nomeDoArquivo('a/b/c.m4a', '2026-08-01'), 'gratidao-2026-08-01.m4a');
  assert.equal(nomeDoArquivo('sem-extensao', '2026-08-01'), 'gratidao-2026-08-01.webm', 'sem extensão, chuta webm em vez de sair sem nome');
});

test('baixar força o anexo — não abre outra aba tocando', () => {
  // `<a download>` é ignorado quando o arquivo vem de outro domínio, e o
  // Storage é outro domínio. Sem o parâmetro, "baixar" viraria "tocar de novo".
  assert.equal(linkParaBaixar('https://sb/x/y.webm?token=abc', 'gratidao-2026-09-09.webm'),
    'https://sb/x/y.webm?token=abc&download=gratidao-2026-09-09.webm');
  assert.equal(linkParaBaixar('https://sb/x/y.webm', 'g.webm'), 'https://sb/x/y.webm?download=g.webm');
  assert.equal(linkParaBaixar(null, 'g.webm'), null);
});

test('a entrada do diário carrega a voz daquele dia', () => {
  const e = entradaDe({ id: 7, data: '2026-09-09', titulo: 'Ritual', comprovacao: { audio_gratidao_path: 'xgame/gratidao/u1/a.webm', audio_gratidao_seg: 42 } });
  assert.equal(e.audioPath, 'xgame/gratidao/u1/a.webm');
  assert.equal(e.audioSeg, 42);
  assert.equal(e.audioExpirou, false);
  // sem gravação, nada de campo fantasma acendendo botão que não toca nada
  assert.equal(entradaDe({ id: 8, comprovacao: {} }).audioPath, null);
  // depois da faxina: o caminho some, a lembrança fica
  assert.equal(entradaDe({ id: 9, comprovacao: { audio_gratidao_expirado: true } }).audioExpirou, true);
});

test('🔴 a faxina tira o caminho e MANTÉM a lembrança de que houve gravação', () => {
  const antes = { tipo: 'ritual', gratidao: 'obrigado', audio_gratidao_path: 'xgame/gratidao/u1/a.webm', audio_gratidao_seg: 20 };
  const depois = comprovacaoSemAudio(antes);
  assert.equal(depois.audio_gratidao_path, undefined, 'o caminho tem que sair — senão o play só devolve erro');
  assert.equal(depois.audio_gratidao_expirado, true);
  assert.equal(depois.gratidao, 'obrigado', 'a faxina do ÁUDIO não pode levar o texto junto');
  assert.equal(depois.tipo, 'ritual');
  assert.equal(depois.audio_gratidao_seg, 20, 'quanto tempo ela falou continua sendo parte do dia dela');
});

test('🔴 o cron usa A MESMA régua da tela — nunca a própria conta de datas', () => {
  // Se o cron tivesse o próprio `data < hoje - 30`, um dia a tela diria "some em
  // 3 dias" e ele apagaria hoje. Uma régua só, importada, é o que impede isso.
  assert.match(CRON, /import \{ audioExpirado, RETENCAO_AUDIO_DIAS \} from '\.\.\/\.\.\/src\/lib\/acervoDeVoz\.js'/);
  assert.match(CRON, /audioExpirado\(t\.data, hoje\)/);
  assert.ok(!/data=lt\./.test(CRON), 'apareceu filtro de data montado à mão — é assim que as duas contas divergem');
  assert.match(PECA, /from '@\/lib\/acervoDeVoz'/, 'a tela tem que ler a mesma régua');
});

test('🔴 apaga o ARQUIVO antes de limpar o caminho — e nunca o contrário', () => {
  // Arquivo fora + PATCH falhou = amanhã a linha volta pra lista e o serviço
  // termina. PATCH primeiro + remoção falhando = arquivo órfão no cofre PRA
  // SEMPRE, sem ninguém saber que ele está lá. Com voz de gente, não dá.
  const corpo = CRON.slice(CRON.indexOf('for (const t of alvos)'));
  const iDelete = corpo.indexOf("method: 'DELETE'");
  const iPatch = corpo.indexOf("method: 'PATCH'");
  assert.ok(iDelete > -1 && iPatch > -1, 'sumiu um dos dois passos');
  assert.ok(iDelete < iPatch, 'a ordem inverteu: isso deixa arquivo órfão no cofre');
  assert.match(corpo, /r\.status !== 404/, 'objeto que já sumiu não pode travar a limpeza do caminho');
});

test('a faxina tem teto e ensaio — apagar em massa nunca é o primeiro passo', () => {
  assert.match(CRON, /TETO_POR_RODADA = 200/);
  assert.match(CRON, /\.slice\(0, TETO_POR_RODADA\)/, 'sem o teto, um erro de régua vira "apagou tudo"');
  assert.match(CRON, /ensaio: true/, 'o GET tem que contar sem apagar');
  assert.match(CRON, /req\.method === 'GET' && !req\.query\?\.executar/);
});

test('o cron está registrado — e fora da janela do ritual', () => {
  const c = VERCEL.crons.find((x) => x.path.includes('purgarAudiosAntigos'));
  assert.ok(c, 'a rota existe mas ninguém chama: a faxina nunca aconteceria');
  const [min, hora] = c.schedule.split(' ');
  const emMin = Number(hora) * 60 + Number(min);
  // O ritual é gravável das 04h40 às 07h15 — varrer o acervo bem na hora em que
  // todo mundo está gravando é procurar briga por nada.
  assert.ok(emMin < 4 * 60 + 40 || emMin > 7 * 60 + 15, `${c.schedule} cai dentro da janela do ritual`);
});

test('a tela oferece ouvir, baixar e o prazo — os três, no mesmo lugar', () => {
  for (const marca of ['botao-ouvir-gratidao', 'botao-baixar-gratidao', 'aviso-retencao-gratidao']) {
    assert.ok(PECA.includes(marca), `faltou ${marca} — a peça não está completa`);
  }
  // Item 4 do dono: ouvir a gratidão NO DIÁRIO, que é onde se revisita.
  assert.match(DIARIO, /<OuvirGratidao/, 'o diário voltou a só CONTAR que houve áudio, sem deixar ouvir');
  assert.match(DIARIO, /diario-gratidao-expirada/, 'depois da faxina o diário precisa explicar o sumiço');
});
