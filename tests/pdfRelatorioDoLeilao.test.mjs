// 📄 O PDF DO RELATÓRIO DE LEILÃO — testado sem navegador.
//
// 🔴 POR QUE ESTE ARQUIVO EXISTE
// Este PDF saiu ERRADO na primeira montagem, e de um jeito que nenhum teste de
// número teria pego: o título passava da margem direita e a ressalva
// transbordava a moldura. Os dois defeitos vinham de MEDIDA, não de conta —
// e medida só se prova gerando o documento de verdade.
//
// `montarPdfDoLeilao` devolve o documento SEM salvar exatamente pra isso.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { relatorioDoLeilao, RESSALVA, SELO_INTERNO } from '../src/lib/relatorioDoLeilao.js';
import { montarPdfDoLeilao, tamanhoQueCabe } from '../src/lib/pdfRelatorioDoLeilao.js';
import { jsPDF } from 'jspdf';

const ABRIU = '2026-09-14T12:00:00.000Z';
const FECHOU = '2026-09-20T23:00:00.000Z';

function fixture({ titulo = 'Playstation 5 Slim', quantos = 36 } = {}) {
  const leilao = {
    id: 'a1', title: titulo, status: 'ended',
    created_date: ABRIU, end_time: FECHOU,
    starting_price: 1, current_price: 3200, frete_reservado_valor: 120,
    winner_id: 'u2', winner_name: 'Ângela Conceição',
  };
  const nomes = { u1: 'José Antônio da Conceição', u2: 'Ângela Conceição', u3: 'Luís Gonçalves Açu' };
  const lances = [];
  for (let i = 0; i < 12; i += 1) {
    lances.push({ sender_id: ['u1', 'u2', 'u3'][i % 3], bid_amount: 100 + i, created_date: new Date(Date.parse(ABRIU) + i * 3600e3).toISOString() });
  }
  const depositos = [];
  for (let i = 0; i < quantos; i += 1) {
    depositos.push({
      id: `d${i}`, buyer_id: ['u1', 'u2', 'u3'][i % 3], buyer_name: null,
      status: i % 9 === 0 ? 'pending' : 'paid', total_amount: 100 * (i + 1),
      payment_method: ['pix', 'credit_card', 'saldo'][i % 3],
      created_date: new Date(Date.parse(ABRIU) + i * 4000e3).toISOString(),
    });
  }
  const reservas = [{ user_id: 'u2', direcao: 'entrada_reserva', valor: 3200, created_at: ABRIU }];
  return relatorioDoLeilao({ leilao, lances, depositos, reservas, nomes, agora: new Date(FECHOU) });
}

/** O texto escrito dentro do PDF, página por página. */
function textoDoPdf(doc) {
  const bytes = Buffer.from(doc.output('arraybuffer')).toString('latin1');
  const trechos = bytes.match(/\((?:\\.|[^\\()])*\)/g) || [];
  return trechos
    .map((t) => t.slice(1, -1).replace(/\\([()\\])/g, '$1').replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
      .replace(/[\u0080-ÿ]/g, (c) => Buffer.from([c.charCodeAt(0)]).toString('latin1')))
    .join('\n');
}

describe('o PDF sai, e sai inteiro', () => {
  test('monta sem explodir e devolve nome de arquivo limpo', () => {
    const { doc, nome } = montarPdfDoLeilao(fixture());
    assert.ok(doc.getNumberOfPages() >= 1);
    // sem acento, sem espaço: nome de arquivo que sobrevive a qualquer sistema
    assert.match(nome, /^depositos-[a-z0-9-]+\.pdf$/);
  });

  test('relatório vazio é recusado, não sai um PDF em branco', () => {
    assert.throws(() => montarPdfDoLeilao(null), /vazio/);
    assert.throws(() => montarPdfDoLeilao({}), /vazio/);
  });

  test('🔴 a RESSALVA está escrita no documento', () => {
    // sem ela o número "R$ 60.800" é lido como o caixa do leilão, e não é
    const { doc } = montarPdfDoLeilao(fixture());
    const t = textoDoPdf(doc).replace(/\n/g, ' ');
    assert.ok(t.includes('Um depósito não fica marcado com o leilão'), 'a ressalva sumiu do PDF');
    assert.ok(RESSALVA.startsWith('Um depósito não fica marcado'));
  });

  test('🔒 o selo de uso interno está em TODAS as páginas', () => {
    // a folha que circula solta é sempre UMA — a página 2 tem que se defender sozinha
    const { doc } = montarPdfDoLeilao(fixture({ quantos: 40 }));
    const paginas = doc.getNumberOfPages();
    assert.ok(paginas >= 2, 'o teste precisa de mais de uma página pra valer');
    const t = textoDoPdf(doc);
    const vezes = t.split(SELO_INTERNO).length - 1;
    assert.equal(vezes, paginas);
    assert.ok(t.includes(`1/${paginas}`) && t.includes(`${paginas}/${paginas}`));
  });

  test('acento DECOMPOSTO (NFD) vira acento de verdade no PDF', () => {
    // 🔴 Isto é o que o `txt()` defende. Texto colado do macOS ou digitado em
    // certos teclados chega como "A" + acento solto; as fontes padrão do jsPDF
    // são Latin-1 e o acento solto não existe lá — sem normalizar, o nome sai
    // estropiado. Fixture em NFC não prova nada disso, por isso esta entrada é
    // decomposta de propósito.
    // nome que NÃO aparece em nenhum outro canto do documento: se ele aparecer
    // composto, foi o txt() que compôs — e não outra linha qualquer do PDF
    const composto = 'Iracêma Açúmã';
    const decomposto = composto.normalize('NFD');
    assert.notEqual(decomposto, composto, 'o fixture precisa estar mesmo decomposto');
    const rel = fixture();
    assert.ok(!JSON.stringify(rel).includes(composto), 'escolha um nome que não exista no resto do relatório');
    rel.pessoas[0].nome = decomposto;
    const { doc } = montarPdfDoLeilao(rel);
    const t = textoDoPdf(doc);
    assert.ok(t.includes(composto), 'o acento decomposto não foi normalizado');
  });

  test('o acento sobrevive até a última página', () => {
    // 🔴 o defeito clássico do jsPDF: o acento sai no começo e some no meio
    const { doc } = montarPdfDoLeilao(fixture({ quantos: 40 }));
    const t = textoDoPdf(doc);
    const linhas = t.split('\n');
    const metade = Math.floor(linhas.length / 2);
    assert.ok(linhas.slice(0, metade).some((l) => l.includes('Ângela')), 'acento faltando na primeira metade');
    assert.ok(linhas.slice(metade).some((l) => l.includes('Ângela')), 'acento faltando na segunda metade');
    assert.ok(t.includes('José Antônio da Conceição'));
    assert.ok(t.includes('Luís Gonçalves Açu'));
  });

  test('o cabeçalho da tabela se repete na página seguinte', () => {
    // tabela que vira a página sem cabeçalho vira coluna de número sem nome
    const { doc } = montarPdfDoLeilao(fixture({ quantos: 40 }));
    const t = textoDoPdf(doc);
    assert.ok(t.split('Situação').length - 1 >= 2, 'o cabeçalho do extrato não se repetiu');
  });
});

describe('o título tem que caber na folha', () => {
  // 🔴 Nome de leilão é texto de usuário. A 19pt um nome comprido passava da
  // margem e saía CORTADO na borda direita — defeito de medida, invisível pra
  // quem só confere número.
  const medirFalso = (porPonto) => (t) => t * porPonto;

  test('cabendo em 19, fica em 19', () => {
    assert.equal(tamanhoQueCabe(medirFalso(1), { largura: 100 }), 19);
  });

  test('não cabendo, encolhe até caber', () => {
    // largura 100, 6 por ponto → só cabe de 16 pra baixo
    assert.equal(tamanhoQueCabe(medirFalso(6), { largura: 100 }), 16);
  });

  test('nem no mínimo cabendo, devolve o mínimo (aí quebra em linha)', () => {
    assert.equal(tamanhoQueCabe(medirFalso(50), { largura: 100 }), 12);
  });

  test('título gigante não explode nem vira dez linhas', () => {
    const titulo = 'Playstation 5 Slim Edição Especial Comemorativa com Dois Controles e Jogo — Ângela & Cia (ação beneficente)';
    const { doc } = montarPdfDoLeilao(fixture({ titulo }));
    const t = textoDoPdf(doc);
    assert.ok(t.includes('Ângela & Cia'), 'o título foi cortado');
    assert.ok(doc.getNumberOfPages() >= 1);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// 🔴 A MEDIDA — o teste que os dois defeitos reais deste PDF exigiram
// ═══════════════════════════════════════════════════════════════════════════
// Na primeira montagem o título passava da margem direita (19pt num nome
// comprido) e a ressalva transbordava a moldura (a quebra era medida em 6pt e
// desenhada em 7.5). Nenhum teste de conteúdo pegaria: o texto ESTAVA lá, só
// estava fora da folha.
//
// Este bloco lê o próprio fluxo do PDF — cada `Tf` (fonte + tamanho), cada
// `Td` (posição) e cada `Tj` (texto) — e mede se a linha cabe entre as
// margens. É a única forma honesta de provar isto sem olho humano.

const PT = 72 / 25.4;              // mm → pt
const MARGEM_PT = 14 * PT;
const LARGURA_PT = 210 * PT;

/** Cada pedaço de texto desenhado, com o tamanho e o x em que foi posto. */
function linhasDesenhadas(doc) {
  const bruto = Buffer.from(doc.output('arraybuffer')).toString('latin1');
  const linhas = [];
  let tamanho = 10; let negrito = false; let x = 0;
  const re = /\/(F\d) ([\d.]+) Tf|([-\d.]+) ([-\d.]+) Td|(T\*)?\s*\(((?:\\.|[^\\()])*)\) Tj/g;
  let m;
  while ((m = re.exec(bruto)) !== null) {
    if (m[1]) { negrito = m[1] === 'F2'; tamanho = Number(m[2]); continue; }
    if (m[3] !== undefined) { x = Number(m[3]); continue; }
    if (m[6] !== undefined) {
      const texto = m[6].replace(/\\([()\\])/g, '$1');
      if (texto.trim()) linhas.push({ texto, tamanho, negrito, x });
    }
  }
  return linhas;
}

/** A régua: o mesmo jsPDF medindo, em pontos. */
function medidor() {
  const d = new jsPDF({ unit: 'pt', format: 'a4' });
  return ({ texto, tamanho, negrito }) => {
    d.setFont('helvetica', negrito ? 'bold' : 'normal');
    d.setFontSize(tamanho);
    return d.getTextWidth(texto);
  };
}

describe('🔴 nada desenhado sai da folha', () => {
  const conferir = (rel) => {
    const { doc } = montarPdfDoLeilao(rel);
    const medir = medidor();
    const fora = [];
    for (const l of linhasDesenhadas(doc)) {
      const fim = l.x + medir(l);
      // 1pt de folga: o PDF guarda coordenada com arredondamento
      if (l.x < MARGEM_PT - 1 || fim > LARGURA_PT - MARGEM_PT + 1) {
        fora.push(`${l.texto.slice(0, 60)} (x=${l.x.toFixed(1)} fim=${fim.toFixed(1)})`);
      }
    }
    return fora;
  };

  test('o relatório normal cabe inteiro', () => {
    const fora = conferir(fixture({ quantos: 40 }));
    assert.deepEqual(fora, [], `saiu da margem:\n${fora.join('\n')}`);
  });

  test('o título comprido também cabe — foi ele que estourou de verdade', () => {
    const titulo = 'Playstation 5 Slim Edição Especial Comemorativa com Dois Controles e Jogo — Ângela & Cia (ação beneficente)';
    const fora = conferir(fixture({ titulo }));
    assert.deepEqual(fora, [], `saiu da margem:\n${fora.join('\n')}`);
  });

  test('a régua funciona: um texto grande demais É apontado', () => {
    // 🔴 sem esta prova, um medidor quebrado deixaria os dois testes acima
    // passando com a folha toda estourada
    const medir = medidor();
    const largo = medir({ texto: 'x'.repeat(400), tamanho: 19, negrito: true });
    assert.ok(largo > LARGURA_PT - MARGEM_PT * 2, 'o medidor não está medindo nada');
  });
});
