// 📄 O LAUDO QUE PRECISA SABER CALAR (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ESTES TESTES EXISTEM
// ═══════════════════════════════════════════════════════════════════════════
// Dono: o laudo serve pra "quando o usuário reclamar de algum erro, podermos
// ver na hora se foi mal uso do usuário ou se de fato é erro".
//
// Um laudo é perigoso na proporção da confiança que ele dá. Se ele imprimir
// "reprovada — ritual perdido" e nada mais, quem lê conclui MAL USO e fecha o
// assunto — foi o que quase aconteceu com a Iara em 10/09, quando onze envios
// de vídeo voltaram HTTP 413 e a culpa ia sobrar pra ela.
//
// Então o que estes testes protegem não é o layout: é a HONESTIDADE. O laudo
// tem que gritar quando houve falha nossa, e tem que dizer "não sei" quando
// não sabe. Silêncio virando atestado de bom uso é o mesmo erro ao contrário.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  statusDaComprovacao, desfechoDoStatus, temRastro, motivoDaComprovacao, horaConcluida,
  linhaDoLaudo, ordenarLinhas, vereditoDoLaudo, laudoDoDia, laudosDoDia, nomeDoLaudo,
} from '../src/lib/relatorioComprovacoes.js';
import { rastroDa, comFalha } from '../src/lib/rastroDaComprovacao.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('o status gravado sempre vence; sem status, `valido` decide', () => {
  assert.equal(statusDaComprovacao({ status: 'aprovada_ritual', valido: false }), 'aprovada_ritual');
  assert.equal(statusDaComprovacao({ valido: true }), 'aprovada_ia');
  assert.equal(statusDaComprovacao({ valido: false }), 'reprovada');
  assert.equal(statusDaComprovacao(null), 'reprovada');
});

test('🔴 as TRÊS cópias da regra de status são idênticas — divergir aqui é o bug do PR #224', () => {
  // A regra mora em duas telas (que arrastam React e Supabase, e por isso não
  // dá pra importar num teste de node) e agora aqui. Enquanto as três forem
  // texto igual, tanto faz qual o laudo usa. No dia em que alguém mudar uma
  // e esquecer as outras, é este teste que avisa — não o usuário.
  const regra = /c\?\.status \|\| \(c\?\.valido \? 'aprovada_ia' : 'reprovada'\)/;
  assert.match(semComentarios(ler('../src/lib/relatorioComprovacoes.js')), regra, 'o laudo mudou de regra sozinho');
  assert.match(semComentarios(ler('../src/components/licensing/CentralVendas/Comprovacoes.jsx')), regra, 'a fila do gestor divergiu do laudo');
  assert.match(semComentarios(ler('../src/components/licensing/XGameAdmin.jsx')), regra, 'o ADM do X-GAME divergiu do laudo');
});

test('"negadas e aceitas": o ritual e a aprovação manual contam como aceitas', () => {
  assert.equal(desfechoDoStatus('aprovada_ritual'), 'aprovada');
  assert.equal(desfechoDoStatus('aprovada_manual'), 'aprovada');
  assert.equal(desfechoDoStatus('aprovada_ia'), 'aprovada');
  assert.equal(desfechoDoStatus('reprovada'), 'reprovada');
  assert.equal(desfechoDoStatus('em_analise'), 'em_analise');
});

test('🔴 SEM RASTRO NÃO É "TUDO CERTO" — é "não sei"', () => {
  // O rastro nasceu em 10/09. Toda comprovação anterior não tem os campos, e
  // ler isso como "sem sinal técnico" seria dar um atestado de bom uso que
  // ninguém apurou. É a mesma mentira confiante do outro lado.
  const antiga = { status: 'reprovada', valido: false, veredito_ia: { motivo: 'Ritual perdido' } };
  assert.equal(temRastro(antiga), false);
  const l = linhaDoLaudo({ comprovacao: antiga });
  assert.equal(l.leitura.sinal, 'sem_rastro');
  assert.notEqual(l.leitura.sinal, 'normal', 'o laudo passou a atestar bom uso onde não há informação nenhuma');
  assert.equal(vereditoDoLaudo([l]).sinal, 'sem_rastro');
  assert.match(vereditoDoLaudo([l]).texto, /não tem como dizer/i);
});

test('com rastro, a leitura volta a valer', () => {
  const nova = { status: 'aprovada_ia', ...rastroDa({ anterior: null, tempoTelaS: 300 }) };
  assert.equal(temRastro(nova), true);
  assert.equal(linhaDoLaudo({ comprovacao: nova }).leitura.sinal, 'normal');
});

test('🔴 O DIA DA IARA, ponta a ponta: o laudo defende, não acusa', () => {
  // A manhã real de 10/09, reconstruída: vídeo recusado com 413, ritual
  // concluído 05:34:12 (4 minutos depois do corte), comprovação "reprovada".
  const falhas = comFalha([], { o_que: 'video', erro: 'autorização negada (HTTP 413)' });
  const itens = [{
    id: 't1', user_id: 'iara', data: '2026-09-10', hora: '05:30', titulo: 'Ritual do Amanhecer', feito: false,
    comprovacao: {
      tipo: 'ritual', status: 'reprovada', valido: false,
      quando: '2026-09-10T08:34:12.000Z',
      veredito_ia: { motivo: 'Ritual perdido — passou do prazo de 5h30.' },
      ...rastroDa({ anterior: null, tempoTelaS: 300, falhas }),
    },
  }];
  const laudo = laudoDoDia({ itens, data: '2026-09-10', pessoaId: 'iara', nome: 'Iara' });

  assert.equal(laudo.reprovadas, 1, 'a reprovação continua visível — o laudo não maquia');
  assert.equal(laudo.veredito.sinal, 'erro_do_sistema');
  assert.match(laudo.veredito.texto, /NÃO é mal uso/i, 'o veredito parou de defender quem reclamou');
  assert.doesNotMatch(laudo.veredito.texto, /mal uso do usu|culpa/i, 'o veredito virou acusação');

  const [linha] = laudo.linhas;
  assert.equal(linha.concluidaAs, '05:34:12', 'os segundos somem e some junto a diferença entre perder e não perder o prazo');
  assert.match(linha.motivo, /Ritual perdido/);
  assert.equal(linha.falhas.length, 1);
  assert.match(linha.leitura.texto, /413/, 'o número do erro tem que aparecer — é o que cruza com o log');
});

test('⚠️ a hora sai em Brasília, não no fuso de quem abre o laudo', () => {
  // Mesmo bug de classe da DIR-129/134. Um gestor com o fuso trocado veria a
  // pessoa entregando numa hora que ela não entregou — e é a HORA que decide
  // o ritual.
  assert.equal(horaConcluida('2026-09-10T08:34:12.000Z'), '05:34:12');
  assert.equal(horaConcluida('2026-09-10T02:59:00.000Z'), '23:59:00', 'perto da virada do dia é onde o fuso errado mais dói');
  assert.equal(horaConcluida(null), null);
  assert.equal(horaConcluida('nada disso'), null);
});

test('🔴 `feito` e `status` são coisas diferentes — o laudo mostra as duas', () => {
  // Caso real de 10/09 (Elenice): status "reprovada" e `feito: true`. O motor
  // do X-GAME conta `feito`, então ela NÃO perdeu o dia. Quem lesse só o
  // status concluiria o contrário e iria "consertar" o que estava certo.
  const laudo = laudoDoDia({
    itens: [{ feito: true, titulo: 'Ritual', comprovacao: { status: 'reprovada', ...rastroDa({}) } }],
    data: '2026-09-10', nome: 'Elenice',
  });
  assert.equal(laudo.reprovadas, 1);
  assert.equal(laudo.feitas, 1, 'sumiu a contagem do que o motor conta — o laudo passou a contradizer o placar');
  assert.equal(laudo.linhas[0].feito, true);
});

test('a última palavra é do gestor: o motivo dele vem na frente do da IA', () => {
  assert.equal(motivoDaComprovacao({ motivo_gestor: 'print de outro dia', veredito_ia: { motivo: 'ok' } }), 'print de outro dia');
  assert.equal(motivoDaComprovacao({ veredito_ia: { motivo: 'sem o vídeo' } }), 'sem o vídeo');
  assert.equal(motivoDaComprovacao({}), '');
});

test('as linhas saem na ordem do dia; sem hora vai pro fim, sem embaralhar', () => {
  const l = ordenarLinhas([
    { hora: '10:30', titulo: 'b' }, { hora: null, titulo: 'x' },
    { hora: '05:30', titulo: 'a' }, { hora: null, titulo: 'y' },
  ]);
  assert.deepEqual(l.map((x) => x.titulo), ['a', 'b', 'x', 'y']);
});

test('⚠️ o dia MISTURADO avisa quantos registros não têm rastro', () => {
  // O caso que mais engana: uma parte do dia é do "antes" e outra do "depois".
  // Sem a ressalva, o veredito falaria por linhas sobre as quais não sabe nada.
  const linhas = [
    linhaDoLaudo({ comprovacao: { status: 'aprovada_ia' } }),                                   // sem rastro
    linhaDoLaudo({ comprovacao: { status: 'aprovada_ia', ...rastroDa({ tempoTelaS: 200 }) } }), // com rastro, normal
  ];
  const v = vereditoDoLaudo(linhas);
  assert.equal(v.sinal, 'normal');
  assert.match(v.texto, /1 de 2 sem rastro/, 'o veredito calou sobre o que não sabe e passou a soar completo');
});

test('🔴 no mesmo dia, a FALHA TÉCNICA fala antes do "vale conferir"', () => {
  // A ordem do veredito não é por gravidade: é por quem tem o direito de
  // falar primeiro. Um dia com uma falha nossa E uma entrega apressada tem
  // que abrir dizendo "não é mal uso" — se abrir por "vale conferir", a
  // defesa de quem reclamou vira nota de rodapé, que é como a Iara quase
  // ficou com a culpa.
  const linhas = [
    linhaDoLaudo({ comprovacao: { status: 'reprovada', ...rastroDa({ anterior: { tentativas: 3 }, tempoTelaS: 900 }) } }),
    linhaDoLaudo({ comprovacao: { status: 'reprovada', ...rastroDa({ tempoTelaS: 900, falhas: comFalha([], { o_que: 'video', erro: 'HTTP 413' }) }) } }),
  ];
  assert.equal(linhas[0].leitura.sinal, 'olhar', 'premissa: a primeira linha é só sinal de olhar');
  assert.equal(linhas[1].leitura.sinal, 'erro_do_sistema', 'premissa: a segunda linha é falha nossa');
  const v = vereditoDoLaudo(linhas);
  assert.equal(v.sinal, 'erro_do_sistema', 'a falha técnica perdeu a frente — o laudo abriria apontando pra pessoa');
  assert.match(v.texto, /NÃO é mal uso/i);
});

test('🔴 reprovação SOZINHA nunca vira veredito de mal uso', () => {
  // Reprovar é o julgamento da ENTREGA. O veredito é sobre o SISTEMA ter
  // funcionado. Confundir os dois é exatamente o erro de 10/09.
  const linhas = [linhaDoLaudo({ comprovacao: { status: 'reprovada', ...rastroDa({ tempoTelaS: 400 }) } })];
  const v = vereditoDoLaudo(linhas);
  assert.equal(v.sinal, 'normal', 'reprovar passou a acender alarme técnico sozinho');
  assert.doesNotMatch(v.texto, /mal uso|culpa|reprovad/i);
});

test('o laudo do dia separa por pessoa sem reordenar quem chegou antes', () => {
  const itens = [
    { user_id: 'b', data: '2026-09-10', titulo: 't', comprovacao: { status: 'aprovada_ia' } },
    { user_id: 'a', data: '2026-09-10', titulo: 't', comprovacao: { status: 'reprovada' } },
    { user_id: 'b', data: '2026-09-10', titulo: 't', comprovacao: { status: 'reprovada' } },
    { user_id: 'a', data: '2026-09-09', titulo: 'de ontem', comprovacao: { status: 'aprovada_ia' } },
  ];
  const laudos = laudosDoDia({ itens, data: '2026-09-10', nomeDe: (id) => id.toUpperCase() });
  assert.deepEqual(laudos.map((l) => l.nome), ['B', 'A']);
  assert.equal(laudos[0].total, 2);
  assert.equal(laudos[1].total, 1, 'o dia de ontem vazou pro laudo de hoje');
});

test('o dia vazio diz que está vazio, e não que está tudo bem', () => {
  const laudo = laudoDoDia({ itens: [], data: '2026-09-10', nome: 'Ninguém' });
  assert.equal(laudo.total, 0);
  assert.equal(laudo.veredito.sinal, 'sem_rastro');
  assert.match(laudo.veredito.texto, /Nenhuma comprovação/i);
});

test('o nome do arquivo ordena sozinho e sobrevive a acento', () => {
  assert.equal(nomeDoLaudo({ data: '2026-09-10', nome: 'Ailton Ávilla' }), 'laudo-2026-09-10-ailton-avilla.pdf');
  assert.equal(nomeDoLaudo({ data: '2026-09-10', nome: '   ' }), 'laudo-2026-09-10-pessoa.pdf');
});

test('🔴 o laudo NÃO decide nada de nota, ponto ou X-Pay', () => {
  // A Fase 4 (ponderar aprovação na performance) está FORA por decisão do
  // dono. Se um cálculo de ponto entrar aqui de contrabando, este teste cai.
  const fonte = semComentarios(ler('../src/lib/relatorioComprovacoes.js'));
  assert.doesNotMatch(fonte, /pontos|xpay|x_pay|cotacao|ganho|token/i, 'entrou conta de performance no laudo — isso é a Fase 4, que está fora');
  assert.doesNotMatch(fonte, /update|insert|supabase/i, 'o laudo passou a escrever no banco — ele só lê');
});
