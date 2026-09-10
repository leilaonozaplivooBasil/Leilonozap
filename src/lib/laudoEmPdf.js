import { jsPDF } from 'jspdf';
import {
  laudoDoDia, resumoDoLaudo, linhaTecnica, nomeDoLaudo, rodapeDoLaudo, AVISO_DO_LAUDO,
} from './relatorioComprovacoes.js';

// 📄 O LAUDO EM PDF — a Fase 2 (10/09/2026).
//
// Dono: serve pra "quando o usuário reclamar de algum erro ou problema,
// podermos ver na hora se foi mal uso do usuário ou se de fato é erro".
//
// ⚠️ ESTE ARQUIVO NÃO DECIDE NADA DE CONTEÚDO. Toda frase impressa vem pronta
// de `relatorioComprovacoes.js`, onde dá pra provar em teste que nenhuma
// delas acusa ninguém. Aqui só há tinta: onde a linha cai, quando vira
// página, que tamanho tem a fonte.
//
// 🔴 E ele é um `.js` sem React DE PROPÓSITO. Enquanto o desenho morava
// dentro do `.jsx` do botão, nenhum teste conseguia importá-lo (React, ícones
// e o `toast` não sobem em node puro) — e a única conferência possível seria
// ler o arquivo como texto, que é o tipo de teste que passa verde enquanto o
// PDF sai errado. Separado assim, o teste GERA o PDF e lê os bytes.
//
// 🔴 NÃO É o gerador do Financeiro (FinancialPDFGenerator.jsx). Aquele é zona
// proibida por ordem do dono e não foi tocado; este é um arquivo novo, que só
// reaproveita a mesma biblioteca (jsPDF, já no projeto).

const MARGEM = 14;
const COR_TEXTO = [30, 30, 30];
const COR_FRACA = [120, 120, 120];
// A cor do veredito segue o SINAL, não o desfecho: vermelho é falha NOSSA, e
// não "reprovada". Pintar reprovação de vermelho faria o olho concluir culpa
// antes de ler a frase — que é exatamente o que o laudo existe pra evitar.
const COR_SINAL = {
  erro_do_sistema: [190, 45, 45],
  olhar: [180, 120, 20],
  sem_rastro: [110, 110, 110],
  normal: [40, 130, 70],
};

/** Monta o documento (sem salvar) — é por aqui que o teste consegue lê-lo. */
export function montarLaudoPdf({ itens = [], data = null, pessoaId = null, nome = '', agora = new Date() } = {}) {
  const laudo = laudoDoDia({ itens, data, pessoaId, nome });
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const larg = doc.internal.pageSize.getWidth();
  const alt = doc.internal.pageSize.getHeight();
  const util = larg - MARGEM * 2;
  // O rodapé ocupa três linhas de aviso + a linha de geração; o corpo para
  // antes disso pra nunca escrever por cima.
  const PISO = alt - 26;
  let y = 0;

  const novaPagina = () => { doc.addPage(); y = 18; };
  const cabe = (precisa) => { if (y + precisa > PISO) novaPagina(); };
  const escrever = (txt, { x = MARGEM, tam = 9, negrito = false, cor = COR_TEXTO, largura = util } = {}) => {
    doc.setFontSize(tam);
    doc.setFont(undefined, negrito ? 'bold' : 'normal');
    doc.setTextColor(...cor);
    const linhas = doc.splitTextToSize(String(txt ?? ''), largura);
    const altura = linhas.length * (tam * 0.42) + 1;
    cabe(altura);
    doc.text(linhas, x, y);
    y += altura;
    return altura;
  };

  // ── cabeçalho ────────────────────────────────────────────────────────────
  y = 18;
  escrever('LAUDO DE COMPROVAÇÕES', { tam: 15, negrito: true });
  escrever(`${laudo.nome} · ${laudo.rotuloData || laudo.data || ''}`, { tam: 10, cor: COR_FRACA });
  y += 2;
  doc.setDrawColor(210, 210, 210);
  doc.line(MARGEM, y, larg - MARGEM, y);
  y += 6;

  // ── resumo ───────────────────────────────────────────────────────────────
  escrever('RESUMO', { tam: 8, negrito: true, cor: COR_FRACA });
  escrever(resumoDoLaudo(laudo), { tam: 10 });
  y += 4;

  // ── veredito ─────────────────────────────────────────────────────────────
  escrever('LEITURA TÉCNICA', { tam: 8, negrito: true, cor: COR_FRACA });
  escrever(laudo.veredito.texto, { tam: 10, negrito: true, cor: COR_SINAL[laudo.veredito.sinal] || COR_TEXTO });
  y += 5;

  // ── entregas ─────────────────────────────────────────────────────────────
  escrever('ENTREGAS DO DIA', { tam: 8, negrito: true, cor: COR_FRACA });
  y += 1;
  if (!laudo.linhas.length) {
    escrever('Nenhuma comprovação registrada neste dia.', { tam: 10, cor: COR_FRACA });
  }
  laudo.linhas.forEach((l) => {
    // O bloco de uma entrega não pode ser partido no meio: o motivo numa
    // página e a linha técnica na outra é como se lê errado.
    cabe(20);
    const quando = [l.hora ? String(l.hora).slice(0, 5) : null, l.concluidaAs ? `concluída ${l.concluidaAs}` : null].filter(Boolean).join(' · ');
    escrever(`${l.rotulo.toUpperCase()} — ${l.titulo || '(sem título)'}`, { tam: 10, negrito: true, cor: COR_SINAL[l.leitura?.sinal] || COR_TEXTO });
    if (quando) escrever(quando, { x: MARGEM + 3, tam: 8, cor: COR_FRACA, largura: util - 3 });
    // `feito` só aparece quando DIVERGE do desfecho — é aí que ele informa
    // alguma coisa. Caso real: "reprovada" com feito=true (10/09).
    if (l.feito !== (l.desfecho === 'aprovada')) {
      escrever(l.feito ? 'conta como feita no placar, apesar do status' : 'NÃO conta como feita no placar', { x: MARGEM + 3, tam: 8, negrito: true, largura: util - 3 });
    }
    if (l.motivo) escrever(`motivo: ${l.motivo}`, { x: MARGEM + 3, tam: 9, largura: util - 3 });
    escrever(`técnico: ${linhaTecnica(l)}`, { x: MARGEM + 3, tam: 8, cor: COR_FRACA, largura: util - 3 });
    y += 3;
  });

  // ── rodapé em TODA página ────────────────────────────────────────────────
  // O aviso vai em todas de propósito: PDF é lido em pedaço, fotografado numa
  // página só e encaminhado sem a capa. Na capa só, a folha que chega sozinha
  // no grupo chegaria sem ele.
  const paginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= paginas; p += 1) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...COR_FRACA);
    doc.setDrawColor(225, 225, 225);
    doc.line(MARGEM, alt - 20, larg - MARGEM, alt - 20);
    doc.text(doc.splitTextToSize(AVISO_DO_LAUDO, util), MARGEM, alt - 16);
    doc.text(rodapeDoLaudo({ agora, pagina: p, paginas }), MARGEM, alt - 6);
  }

  return { doc, arquivo: nomeDoLaudo({ data, nome: laudo.nome }), laudo };
}

/** Monta e baixa. Devolve o nome do arquivo. */
export function gerarLaudoPdf(args) {
  const { doc, arquivo } = montarLaudoPdf(args);
  doc.save(arquivo);
  return arquivo;
}
