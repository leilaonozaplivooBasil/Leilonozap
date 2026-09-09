// 🖐️ A MÃOZINHA — os alvos do tour existem de verdade? (09/09/2026)
//
// Dono: "Precisamos dar continuidade no Tour guiado."
//
// ⚠️ POR QUE ESTE TESTE EXISTE, E POR QUE ELE É DIFÍCIL DE ESCREVER DIREITO:
//
// O TourGuiado PULA sozinho um passo cujo alvo não está na tela — de
// propósito, pra mãozinha nunca travar apontando pro nada (ex.: fila vazia
// hoje). O efeito colateral é que um alvo ERRADO se comporta igualzinho a um
// alvo AUSENTE: silêncio. Sem erro, sem log, sem nada na tela. O tour continua
// "funcionando" e simplesmente ensina menos — e ninguém descobre.
//
// 🔴 E A ARMADILHA QUE ME PEGOU AO ESCREVER ISTO: metade dos alvos é
// CONDICIONAL, porque só o primeiro item da lista carrega a marca:
//
//     data-teste={i === 0 ? 'sonho-adicionar' : undefined}
//
// Procurar por `data-teste="sonho-adicionar"` não acha isso e dá 6 alvos como
// quebrados quando os 6 estão certos. Quem mexer aqui: procure o NOME como
// string, nunca o atributo literal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { HABITOS } from '../src/lib/metodo.js';
import { TOURS_DISPONIVEIS } from '../src/lib/pedidoDeTour.js';

const RAIZ = new URL('../src/components/licensing/CentralVendas/', import.meta.url);
const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const METODO = ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx');
const CLIENTES = ler('../src/components/licensing/CentralVendas/CrmClientesTab.jsx');
const ESTEIRA = ler('../src/components/licensing/CentralVendas/CrmEsteiraCaptacao.jsx');
const TOUR = ler('../src/components/licensing/CentralVendas/TourGuiado.jsx');

/** Todo o JSX da pasta, junto: é onde os `data-teste` moram. */
const TODO_JSX = readdirSync(RAIZ)
  .filter((f) => f.endsWith('.jsx'))
  .map((f) => readFileSync(new URL(f, RAIZ), 'utf8'))
  .join('\n');

/** Os alvos declarados nas listas de passos (só os de tour, não o `alvo:` do RadarEixos). */
function alvosDe(fonte) {
  return [...fonte.matchAll(/alvo:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
}

const ALVOS = [...new Set([...alvosDe(METODO), ...alvosDe(CLIENTES), ...alvosDe(ESTEIRA)])];

test('🔴 todo alvo do tour existe como data-teste na tela', () => {
  assert.ok(ALVOS.length >= 20, `esperava a coleção inteira de passos, achei ${ALVOS.length}`);
  const orfaos = ALVOS.filter((a) => {
    // o nome como VALOR de data-teste — literal OU dentro de expressão JSX
    const usos = [...TODO_JSX.matchAll(new RegExp(`data-teste=(?:"${a}"|\\{[^}]*'${a}'[^}]*\\})`, 'g'))];
    return usos.length === 0;
  });
  assert.deepEqual(orfaos, [], `alvo sem elemento na tela — o passo é PULADO em silêncio: ${orfaos.join(', ')}`);
});

test('o passo pulado é silencioso de propósito — por isso o teste acima existe', () => {
  // Se um dia isto virar erro visível, este teste perde o motivo de ser; até lá,
  // ele é a ÚNICA coisa que separa "o tour ensina" de "o tour finge que ensina".
  assert.match(TOUR, /Um passo cujo alvo não existe na tela .* é pulado/s);
});

test('🔴 os 8 Hábitos têm tour — e nenhum abre VAZIO', () => {
  // O roteamento é em dois lugares (DIR-124), e o perigo mora na emenda:
  //
  //   CrmClientesTab escuta o pedido e, pros Hábitos que o CrmMetodo desenha,
  //   levanta `tourPendente` — que o CrmMetodo atende com
  //   `PASSOS_POR_PAINEL[painel] || []`.
  //
  // 🔴 Esse `|| []` é o buraco: se o Hábito está na lista do listener mas NÃO
  // no mapa de passos, o tour abre com ZERO passos. Botão clicado, mãozinha
  // aberta, nada ensinado — e nenhum erro em lugar nenhum. Um teste que só
  // procurasse o id do Hábito "em algum lugar" passaria verde nesse estado
  // (foi o que aconteceu na primeira versão deste arquivo).
  const i = CLIENTES.indexOf('ouvirPedidoDeTour');
  const listener = i === -1 ? '' : CLIENTES.slice(i, CLIENTES.indexOf('}), []);', i));
  assert.ok(listener.length > 50, 'não achei o listener de tour do CrmClientesTab');

  // os Hábitos que o listener DELEGA pro CrmMetodo
  const delegados = (listener.match(/\[([^\]]*)\]\.includes\(atual\)/) || [, ''])[1]
    .split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean);
  assert.ok(delegados.length >= 5, `esperava os Hábitos delegados ao CrmMetodo, achei ${delegados.length}`);

  const mapa = METODO.slice(METODO.indexOf('const PASSOS_POR_PAINEL'));
  const semPassos = delegados.filter((id) => !new RegExp(`^\\s*${id}:`, 'm').test(mapa));
  assert.deepEqual(semPassos, [], `delegado ao CrmMetodo mas sem passos no mapa — o tour abriria VAZIO: ${semPassos.join(', ')}`);

  // e os que o próprio CrmClientesTab atende, com estado próprio
  const locais = ['acompanhamento', 'verificacao'];
  for (const id of locais) {
    assert.match(listener, new RegExp(`'${id}'`), `${id} deixou de ser atendido pelo CrmClientesTab`);
  }

  // juntos, os dois caminhos cobrem os 8
  const cobertos = new Set([...delegados, ...locais]);
  const descobertos = HABITOS.filter((h) => !cobertos.has(h.id)).map((h) => `${h.n}-${h.id}`);
  assert.deepEqual(descobertos, [], `Hábito sem tour: ${descobertos.join(', ')}`);
});

test('🔴 quem oferece o botão do tour tem alguém do outro lado pra atender', () => {
  // A cilada: pôr uma aba nova em TOURS_DISPONIVEIS cujo componente NÃO escuta.
  // O botão verde aparece, a pessoa clica, e não acontece nada — pior que não
  // ter botão. `catalogo-clientes` (MyClientsTab) é exatamente essa tentação:
  // o nome parece, mas quem tem o tour é `catalogo-crm` (CrmClientesTab).
  const ids = [...new Set(Object.values(TOURS_DISPONIVEIS))];
  assert.ok(ids.length > 0, 'nenhuma tela oferece tour');
  for (const id of ids) {
    const atendido = new RegExp(`ouvirPedidoDeTour\\(\\(id\\) => \\{[\\s\\S]{0,120}id !== '${id}'`).test(CLIENTES);
    assert.ok(atendido, `'${id}' é oferecido mas ninguém escuta esse pedido`);
  }
  assert.equal(TOURS_DISPONIVEIS['catalogo-clientes'], undefined,
    'catalogo-clientes é o MyClientsTab, que não tem tour — o botão apareceria sem fazer nada');
});
