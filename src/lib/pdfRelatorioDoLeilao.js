// 📄 O PDF DO RELATÓRIO DE LEILÃO.
//
// 22/09/2026 — o dono recebeu este relatório à mão, em PDF, e pediu que virasse
// opção na plataforma. Então o PDF tem que sair IGUAL ao que ele já conhece:
// mesma ordem de blocos, mesmos rótulos, mesma ressalva.
//
// jsPDF com TEXTO (vetorial, leve, selecionável) — mesmo caminho do
// PdfExecutivo.jsx. Nada de html2canvas: imagem de tabela não dá pra copiar
// número, e relatório financeiro existe pra alguém conferir número.
//
// 🔴 DUAS COISAS QUE JÁ MORDERAM E ESTÃO RESOLVIDAS AQUI:
//
// 1. ACENTO. As fontes padrão do jsPDF são Latin-1; `doc.text` com string UTF-8
//    crua come acento no meio do documento. Toda escrita passa por `txt()`, que
//    normaliza — sem isso "Ângela" vira "ngela" da metade do PDF em diante.
//
// 2. CAIXINHA ☐. Helvetica não tem esse glifo e ele sai como bloco preto. Onde
//    precisa de marca, desenha-se um retângulo de verdade.

import { jsPDF } from 'jspdf';

const VERDE = [27, 122, 72];
const AMBAR = [180, 83, 9];
const CINZA = [110, 114, 125];
const PRETO = [17, 24, 39];
const LINHA = [222, 226, 230];

const M = 14;            // margem
const L = 210 - M * 2;   // largura útil (A4 retrato)

/**
 * Texto seguro pro jsPDF. Sem isto o acento some no meio do documento — não no
 * começo, o que torna o defeito fácil de não ver numa conferência rápida.
 */
const txt = (s) => String(s ?? '').normalize('NFC');
// ↑ NFC junta letra + acento solto num caractere só. Texto vindo de teclado de
// celular ou de colagem do macOS chega decomposto ("A" + "^"), e as fontes
// padrão do jsPDF são Latin-1: o acento solto não tem código e some, deixando
// "Ângela" virar "Angela" ou pior. Provado no teste com entrada NFD.

const dinheiro = (n) => `R$ ${(Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dataHora = (ms) => (ms
  ? new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '—');

/**
 * Monta o documento e devolve `{ doc, nome }` SEM salvar.
 *
 * Separado de propósito: `doc.save` é propriedade de INSTÂNCIA no jsPDF e só
 * faz sentido no navegador, então enquanto montar e salvar eram a mesma função
 * não dava pra conferir o PDF fora do navegador — e relatório financeiro que
 * ninguém consegue abrir no teste é relatório que quebra calado em produção.
 */
/**
 * O maior tamanho de fonte (de `maximo` para baixo) em que o texto cabe na
 * largura. Se nem no `minimo` couber, devolve o `minimo` — aí quem chamou
 * quebra em linhas. Recebe a MEDIÇÃO de fora justamente pra poder ser provada
 * sem montar um PDF inteiro.
 */
export function tamanhoQueCabe(medir, { maximo = 19, minimo = 12, largura = L } = {}) {
  for (let t = maximo; t > minimo; t -= 1) {
    if (medir(t) <= largura) return t;
  }
  return minimo;
}

export function montarPdfDoLeilao(rel) {
  if (!rel?.leilao) throw new Error('relatório vazio');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { leilao: A, entrou: E } = rel;
  let y = M;

  // ── quebra de página com margem de segurança ──
  const espaco = (precisa) => {
    if (y + precisa <= 297 - M) return;
    doc.addPage();
    y = M;
  };

  // ── cabeçalho ──
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...CINZA);
  doc.text(txt('LEILÃO NOZAP · RELATÓRIO FINANCEIRO · USO INTERNO'), M, y);
  y += 7;
  // 🔴 O TÍTULO TEM QUE CABER. Nome de leilão é texto de usuário e pode ser
  // longo ("Playstation 5 Slim — Ângela & Cia"): escrito com `doc.text` puro
  // ele passava da margem e saía CORTADO na borda direita da folha.
  //
  // São duas coisas, e a prova por mutação separou uma da outra:
  //   • quem garante que nada sai da folha é a QUEBRA EM LINHAS (splitTextToSize);
  //     tirá-la mata o teste de margem na hora;
  //   • encolher a fonte é COSMÉTICO — serve pra caber numa linha só em vez de
  //     duas. Tirar o encolhimento não estoura nada (a mutação sobreviveu, e
  //     está certo que tenha sobrevivido); quem cobre isso é tamanhoQueCabe,
  //     testada à parte.
  const titulo = txt(`Depósitos do leilão: ${A.titulo}`);
  doc.setFont('helvetica', 'bold');
  const tam = tamanhoQueCabe((t) => { doc.setFontSize(t); return doc.getTextWidth(titulo); });
  doc.setFontSize(tam); doc.setTextColor(...PRETO);
  const linhasTitulo = doc.splitTextToSize(titulo, L);
  doc.text(linhasTitulo, M, y);
  y += (linhasTitulo.length - 1) * (tam * 0.42) + 7;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...CINZA);
  const periodo = `Todo dinheiro que entrou na carteira dos participantes enquanto o leilão esteve aberto — de ${dataHora(A.abriuMs)} a ${A.aindaAberto ? 'agora (em andamento)' : dataHora(A.fechouMs)} (horário de Brasília). Emitido em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`;
  const linhasPeriodo = doc.splitTextToSize(txt(periodo), L);
  doc.text(linhasPeriodo, M, y);
  y += linhasPeriodo.length * 4 + 4;

  // ── ficha do leilão, em duas colunas ──
  const ficha = [
    ['Item', A.titulo, 'Abertura', dinheiro(A.abertura)],
    ['Encerrado', A.aindaAberto ? 'em andamento' : dataHora(A.fechouMs), 'Arremate', dinheiro(A.arremate)],
    ['Arrematante', A.arrematante || '—', 'Frete', dinheiro(A.frete)],
    ['Participantes', `${A.participantes} pessoa${A.participantes === 1 ? '' : 's'}`, 'Cobrado do ganhador', dinheiro(A.cobradoDoGanhador)],
  ];
  doc.setFontSize(8.5);
  for (const [r1, v1, r2, v2] of ficha) {
    espaco(8);
    doc.setFillColor(248, 249, 250); doc.rect(M, y - 4, L, 7, 'F');
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...CINZA);
    doc.text(txt(r1), M + 2, y);
    doc.text(txt(r2), M + L / 2 + 2, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...PRETO);
    doc.text(txt(v1), M + 28, y, { maxWidth: L / 2 - 30 });
    doc.text(txt(v2), M + L - 2, y, { align: 'right' });
    y += 8;
  }
  y += 4;

  // ── o que entrou: quatro números ──
  espaco(26);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...PRETO);
  doc.text(txt('O que entrou'), M, y); y += 6;
  const cards = [
    ['DEPÓSITOS PAGOS', String(E.depositosPagos), 'no período do leilão', VERDE],
    ['VALOR PAGO', dinheiro(E.valorPago), 'só o que compensou', VERDE],
    ['NÃO PAGAS', String(E.tentativasNaoPagas), `${dinheiro(E.valorNaoPago)} que não entrou`, AMBAR],
    ['QUEM DEPOSITOU', String(E.quemDepositou), 'pessoas', PRETO],
  ];
  const cw = L / 4;
  doc.setDrawColor(...LINHA);
  cards.forEach(([rotulo, valor, nota, cor], i) => {
    const x = M + cw * i;
    doc.rect(x, y, cw, 20);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...CINZA);
    doc.text(txt(rotulo), x + 2, y + 4.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...cor);
    doc.text(txt(valor), x + 2, y + 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...CINZA);
    doc.text(txt(nota), x + 2, y + 17, { maxWidth: cw - 4 });
  });
  y += 25;

  // ── 🔴 A RESSALVA. Bloco próprio, com moldura. Nunca rodapé. ──
  espaco(20);
  doc.setFillColor(255, 251, 235); doc.setDrawColor(245, 158, 11);
  // 🔴 A ORDEM AQUI IMPORTA e já mordeu: `splitTextToSize` mede no tamanho de
  // fonte ATUAL. Enquanto a quebra era calculada antes do setFontSize, ela saía
  // medida nos 6pt da legenda dos cartões e desenhada em 7.5 — a ressalva
  // passava da moldura pela direita. Define a fonte PRIMEIRO, sempre.
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  const linhasRessalva = doc.splitTextToSize(txt(rel.ressalva), L - 6);
  const altura = linhasRessalva.length * 3.8 + 6;
  doc.rect(M, y, L, altura, 'FD');
  doc.setTextColor(146, 64, 14);
  doc.text(linhasRessalva, M + 3, y + 5);
  y += altura + 6;

  // ── pessoa por pessoa ──
  espaco(20);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...PRETO);
  doc.text(txt('Pessoa por pessoa'), M, y); y += 6;

  const cols = [
    { r: 'Pessoa', x: M, al: 'left' },
    { r: 'Depósitos', x: M + 78, al: 'right' },
    { r: 'Valor pago', x: M + 106, al: 'right' },
    { r: 'Não pago', x: M + 132, al: 'right' },
    { r: 'Lances', x: M + 150, al: 'right' },
    { r: 'Reservado', x: M + L, al: 'right' },
  ];
  const cabecalhoTabela = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...CINZA);
    for (const c of cols) doc.text(txt(c.r), c.x, y, { align: c.al });
    y += 2;
    doc.setDrawColor(...LINHA); doc.line(M, y, M + L, y);
    y += 4;
  };
  cabecalhoTabela();

  doc.setFontSize(8);
  for (const p of rel.pessoas) {
    if (y + 7 > 297 - M) { doc.addPage(); y = M; cabecalhoTabela(); doc.setFontSize(8); }
    doc.setFont('helvetica', p.arrematou ? 'bold' : 'normal'); doc.setTextColor(...PRETO);
    doc.text(txt(p.nome), cols[0].x, y, { maxWidth: 74 });
    doc.setFont('helvetica', 'normal');
    doc.text(String(p.depositos), cols[1].x, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(txt(dinheiro(p.pago)), cols[2].x, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...(p.naoPago ? AMBAR : CINZA));
    doc.text(txt(p.naoPago ? dinheiro(p.naoPago) : '—'), cols[3].x, y, { align: 'right' });
    doc.setTextColor(...PRETO);
    doc.text(String(p.lances), cols[4].x, y, { align: 'right' });
    doc.setTextColor(...CINZA);
    doc.text(txt(dinheiro(p.reservado)), cols[5].x, y, { align: 'right' });
    y += 6;
  }
  // total
  if (y + 9 > 297 - M) { doc.addPage(); y = M; }
  doc.setDrawColor(...LINHA); doc.line(M, y - 2, M + L, y - 2); y += 2;
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...PRETO);
  doc.text('TOTAL', cols[0].x, y);
  doc.text(String(rel.totais.depositos), cols[1].x, y, { align: 'right' });
  doc.setTextColor(...VERDE);
  doc.text(txt(dinheiro(rel.totais.pago)), cols[2].x, y, { align: 'right' });
  doc.setTextColor(...AMBAR);
  doc.text(txt(dinheiro(rel.totais.naoPago)), cols[3].x, y, { align: 'right' });
  doc.setTextColor(...PRETO);
  doc.text(String(rel.totais.lances), cols[4].x, y, { align: 'right' });
  doc.text(txt(dinheiro(rel.totais.reservado)), cols[5].x, y, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...CINZA);
  const notaReserva = doc.splitTextToSize(txt('"Reservado" é o total que a plataforma segurou na carteira para cobrir os lances dados — não é dinheiro cobrado. Ele é devolvido quando alguém cobre o lance.'), L);
  espaco(notaReserva.length * 3.6 + 4);
  doc.text(notaReserva, M, y);
  y += notaReserva.length * 3.6 + 6;

  // ── extrato ──
  if (rel.extrato.length) {
    espaco(18);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...PRETO);
    doc.text(txt('Extrato, um a um'), M, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...CINZA);
    doc.text(txt('Em ordem de acontecimento. Horário de Brasília.'), M, y); y += 5;

    const ex = [
      { r: 'Quando', x: M, al: 'left' },
      { r: 'Pessoa', x: M + 28, al: 'left' },
      { r: 'Forma', x: M + 100, al: 'left' },
      { r: 'Valor', x: M + 140, al: 'right' },
      { r: 'Situação', x: M + 146, al: 'left' },
    ];
    const cabecalhoExtrato = () => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...CINZA);
      for (const c of ex) doc.text(txt(c.r), c.x, y, { align: c.al });
      y += 2; doc.setDrawColor(...LINHA); doc.line(M, y, M + L, y); y += 4;
    };
    cabecalhoExtrato();
    doc.setFontSize(7.5);
    for (const e of rel.extrato) {
      if (y + 6 > 297 - M) { doc.addPage(); y = M; cabecalhoExtrato(); doc.setFontSize(7.5); }
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...CINZA);
      doc.text(txt(dataHora(e.quandoMs)), ex[0].x, y);
      doc.setTextColor(...PRETO);
      doc.text(txt(e.pessoa), ex[1].x, y, { maxWidth: 68 });
      doc.setTextColor(...CINZA);
      doc.text(txt(e.forma), ex[2].x, y);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...PRETO);
      doc.text(txt(dinheiro(e.valor)), ex[3].x, y, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...(e.pago ? VERDE : AMBAR));
      doc.text(txt(e.pago ? 'pago' : 'não compensou'), ex[4].x, y);
      y += 5.5;
    }
  }

  // ── selo em TODAS as páginas: a folha solta que circula é sempre uma só ──
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...CINZA);
    doc.text(txt(rel.selo), M, 297 - 8);
    doc.text(`${i}/${paginas}`, M + L, 297 - 8, { align: 'right' });
  }

  const nome = `depositos-${String(A.titulo || 'leilao').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.pdf`;
  return { doc, nome };
}

/** Monta e baixa. É o que a tela chama. */
export async function pdfDoRelatorioDoLeilao(rel) {
  const { doc, nome } = montarPdfDoLeilao(rel);
  doc.save(nome);
  return nome;
}

export default pdfDoRelatorioDoLeilao;
