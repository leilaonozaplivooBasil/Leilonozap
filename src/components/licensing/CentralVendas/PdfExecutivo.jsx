import React, { useState } from 'react';
import { toast } from 'sonner';
import { FileDown, Loader2, MessageCircle } from 'lucide-react';
import { textoDoRelatorio, paraPdf } from '@/lib/relatorioExecutivo';
import { pontosDaRoda, pontoDoEixo } from '@/lib/rodaDaVida';

// 📄 O PDF DO EXECUTIVO (dono, 06/09/2026): "quero geração de PDF de cada
// executivo, pra ser compartilhado". Um botão; o conteúdo vem pronto de
// relatorioDoExecutivo() — aqui só se desenha. É jsPDF com TEXTO (vetorial,
// leve, selecionável), na cara da casa: faixa escura da X-EOS, a régua
// azul→magenta da Top College, e o resto em papel branco pra ser lido no
// WhatsApp de qualquer aparelho. Se o aparelho compartilha arquivo
// (navigator.share), abre a folha de compartilhar direto; senão, baixa.
//
// 🎡 09/09/2026 — DIR-112, dono: "o PDF do executivo está muito raso... tem
// que mostrar qual a posição dele do dia... inclusive botar isso no PDF, o
// radar." O painel "POSIÇÃO DO DIA" (liga, próxima liga, Human Token do
// ciclo, % de formação do Executivo Ideal) e a MESMA roda da vida do
// RadarEixos.jsx — vetorial, com `pontosDaRoda`/`pontoDoEixo` de
// `rodaDaVida.js` — agora vivem aqui também, quando `rel.posicaoDoDia`
// chega preenchido.

const COR = { verde: [27, 122, 72], amarelo: [217, 119, 6], vermelho: [220, 38, 38], azul: [59, 111, 246], cinza: [140, 140, 150] };
const PRETO = [0, 2, 12];
const AZUL = [59, 111, 246];
const MAGENTA = [230, 46, 139];
const LOGO = '/brand/icon-3d-256.png';
const LIGA_COR = { diamante: [59, 130, 246], ouro: [217, 119, 6], prata: [130, 138, 156], bronze: [180, 98, 47] };

async function carregarLogo() {
  try {
    const r = await fetch(LOGO); if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((ok) => { const fr = new FileReader(); fr.onloadend = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(blob); });
  } catch { return null; }
}

/** A régua da Top College: azul → magenta em degraus (o jsPDF não tem gradiente nativo). */
function regua(doc, x, y, w, h) {
  const passos = 40;
  for (let i = 0; i < passos; i += 1) {
    const t = i / (passos - 1);
    doc.setFillColor(Math.round(AZUL[0] + (MAGENTA[0] - AZUL[0]) * t), Math.round(AZUL[1] + (MAGENTA[1] - AZUL[1]) * t), Math.round(AZUL[2] + (MAGENTA[2] - AZUL[2]) * t));
    doc.rect(x + (w / passos) * i, y, w / passos + 0.2, h, 'F');
  }
}

/**
 * A roda da vida, vetorial — a MESMA curva de RadarEixos.jsx (Catmull-Rom
 * sobre `pontosDaRoda`), só que desenhada com `doc.lines` em vez de um
 * `<path>` de SVG. O alvo já é o círculo perfeito (raio cheio) — bater a
 * meta em tudo É virar uma roda; a curva do desempenho real fecha nele
 * quando os 5 eixos estão perto de 100%, e "amassa" pra dentro no eixo
 * fraco.
 */
function desenharRoda(doc, { cx, cy, raio, eixos, corAlvo, corAtual, corFraco }) {
  // os raios-guia, do centro até cada eixo (na marca cheia)
  doc.setDrawColor(228, 230, 238); doc.setLineWidth(0.25);
  eixos.forEach((_, i) => {
    const a = (Math.PI * 2 * i) / eixos.length - Math.PI / 2;
    doc.line(cx, cy, cx + Math.cos(a) * raio, cy + Math.sin(a) * raio);
  });
  // o alvo — círculo perfeito, tracejado
  doc.setDrawColor(corAlvo[0], corAlvo[1], corAlvo[2]); doc.setLineWidth(0.45);
  if (doc.setLineDashPattern) doc.setLineDashPattern([1.4, 1.1], 0);
  doc.circle(cx, cy, raio, 'S');
  if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

  // a roda de verdade — a curva suave do desempenho, preenchida e translúcida
  const curva = pontosDaRoda(eixos).map(([x, y]) => [cx + x * raio, cy + y * raio]);
  if (curva.length > 2) {
    const seg = curva.slice(1).map(([x, y], i) => [x - curva[i][0], y - curva[i][1]]);
    let opacou = false;
    try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.26 })); opacou = true; } catch { /* sem transparência, sem drama */ }
    doc.setFillColor(corAtual[0], corAtual[1], corAtual[2]);
    doc.setDrawColor(corAtual[0], corAtual[1], corAtual[2]); doc.setLineWidth(0.6);
    doc.lines(seg, curva[0][0], curva[0][1], [1, 1], 'FD', true);
    if (opacou) doc.restoreGraphicsState();
    doc.setDrawColor(corAtual[0], corAtual[1], corAtual[2]); doc.setLineWidth(0.7);
    doc.lines(seg, curva[0][0], curva[0][1], [1, 1], 'S', true);
  }
  // o vértice de cada eixo — um pontinho, vermelho quando fraco
  eixos.forEach((e, i) => {
    const [x, y] = pontoDoEixo(eixos, i, raio);
    const c = (e.atual < e.alvo) ? corFraco : corAtual;
    doc.setFillColor(c[0], c[1], c[2]); doc.circle(cx + x, cy + y, 1, 'F');
  });
}

/** Desenha o relatório e devolve o documento. Exportado pra prova. */
export async function desenharPdf(rel, { jsPDF, logo = null } = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const larg = W - M * 2;
  let y = 0;

  const rodape = () => {
    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p += 1) {
      doc.setPage(p);
      regua(doc, 0, H - 4, W, 1.2);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 130);
      doc.text(paraPdf(rel.rodape), M, H - 7);
      doc.text(`página ${p} de ${total}`, W - M, H - 7, { align: 'right' });
    }
  };
  const novaPagina = () => { doc.addPage(); y = M; };
  const garantir = (alt) => { if (y + alt > H - 14) novaPagina(); };
  const bola = (x, yy, cor, r = 1.6) => { const c = COR[cor] || COR.cinza; doc.setFillColor(c[0], c[1], c[2]); doc.circle(x, yy, r, 'F'); };

  // ── a faixa escura ──
  doc.setFillColor(PRETO[0], PRETO[1], PRETO[2]); doc.rect(0, 0, W, 40, 'F');
  regua(doc, 0, 40, W, 1.6);
  if (logo) { try { doc.addImage(logo, 'PNG', M, 9, 14, 14); } catch { /* sem logo, sem drama */ } }
  const xT = logo ? M + 18 : M;
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(19);
  doc.text('X-PERFORMANCE', xT, 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(200, 205, 220);
  doc.text('Relatório do Executivo', xT, 23.5);
  doc.setFontSize(8); doc.setTextColor(150, 155, 175);
  doc.text(paraPdf(rel.marca).toUpperCase(), W - M, 15, { align: 'right' });
  doc.text(paraPdf(rel.periodoRotulo), W - M, 20.5, { align: 'right' });
  // quem
  // 🐛 09/09/2026 — achado na auditoria: nome sem limite de largura, ao
  // contrário do resto do PDF (que sempre usa splitTextToSize). Um nome
  // completo brasileiro mais longo empurrava o subtítulo pra fora da
  // página ou por cima do "X-EOS/período" alinhado à direita. Agora o
  // tamanho da fonte encolhe até caber, e o subtítulo só divide a linha
  // com o nome se sobrar espaço — senão desce pra linha de baixo.
  doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  const nomePdf = paraPdf(rel.pessoa.nome);
  const largDisponivelNome = W - M - xT;
  let tamNome = 15;
  doc.setFontSize(tamNome);
  while (doc.getTextWidth(nomePdf) > largDisponivelNome && tamNome > 9) { tamNome -= 0.5; doc.setFontSize(tamNome); }
  doc.text(nomePdf, xT, 33);
  const largNome = doc.getTextWidth(nomePdf);
  const sub = [rel.pessoa.posicao, rel.pessoa.funcao, rel.pessoa.fixo ? `fixo ${rel.pessoa.fixo}` : null].filter(Boolean).join('  ·  ');
  y = 48;
  if (sub) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(180, 185, 205);
    const subPdf = paraPdf(sub);
    if (xT + largNome + 4 + doc.getTextWidth(subPdf) <= W - M) {
      doc.text(subPdf, xT + largNome + 4, 33);
    } else {
      doc.text(subPdf, xT, 38.5);
      y = 52;
    }
  }

  // ── semáforo + números ──
  if (rel.semaforo) {
    bola(M + 2, y - 1, rel.semaforo.cor, 2.2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60, 60, 70);
    doc.text(paraPdf(rel.semaforo.texto), M + 7, y);
    y += 7;
  }
  const lt = (larg - 3 * 3) / 4;
  rel.numeros.forEach((n, i) => {
    const x = M + i * (lt + 3);
    doc.setFillColor(246, 247, 250); doc.roundedRect(x, y, lt, 16, 1.5, 1.5, 'F');
    const c = COR[n.cor] || COR.cinza; doc.setFillColor(c[0], c[1], c[2]); doc.rect(x, y, 1.2, 16, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(120, 120, 135);
    doc.text(paraPdf(n.rotulo).toUpperCase(), x + 4, y + 5.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(c[0], c[1], c[2]);
    doc.text(paraPdf(n.valor), x + 4, y + 12.5);
  });
  y += 24;

  // ── posição do dia (DIR-112) — liga, próxima liga, token do ciclo,
  // formação do Executivo Ideal e a roda da vida, lado a lado ──
  if (rel.posicaoDoDia) {
    const p = rel.posicaoDoDia;
    const RAIO_RODA = 22;
    const ALT_PAINEL = RAIO_RODA * 2 + 14;
    garantir(ALT_PAINEL + 10);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 135);
    doc.text('POSIÇÃO DO DIA', M, y, { charSpace: 0.6 });
    y += 2; doc.setDrawColor(225, 227, 235); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 4;

    doc.setFillColor(250, 250, 252); doc.roundedRect(M, y, larg, ALT_PAINEL, 2, 2, 'F');
    const cxRoda = M + 14 + RAIO_RODA;
    const cyRoda = y + ALT_PAINEL / 2;
    if (Array.isArray(p.eixos) && p.eixos.length >= 3) {
      desenharRoda(doc, { cx: cxRoda, cy: cyRoda, raio: RAIO_RODA, eixos: p.eixos, corAlvo: COR.amarelo, corAtual: COR.verde, corFraco: COR.vermelho });
    }

    // liga + próxima liga + token + formação, à direita da roda
    const xx = M + 14 + RAIO_RODA * 2 + 12;
    let yy = y + 9;
    const ligaCor = LIGA_COR[p.liga?.id] || COR.cinza;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(ligaCor[0], ligaCor[1], ligaCor[2]);
    doc.text(paraPdf(`${p.liga?.emoji || ''} ${p.liga?.label || ''}`), xx, yy);
    yy += 6.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90, 90, 105);
    if (p.proxima) doc.text(paraPdf(`Faltam ${p.proxima.falta} pontos de Human Token pra ${p.proxima.emoji} ${p.proxima.label}`), xx, yy);
    else doc.text('Já é a liga mais alta do jogo — a elite do Executivo Ideal.', xx, yy);
    yy += 7.5;
    if (p.tokenCiclo !== null) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 30, 40);
      doc.text(`Human Token do ciclo: ${p.tokenCiclo}${p.tokenMax ? ` / ${p.tokenMax}` : ''}`, xx, yy);
      yy += 6;
    }
    if (p.formacaoPct !== null) {
      const corForm = p.formacaoPct >= 66 ? COR.verde : p.formacaoPct >= 33 ? COR.amarelo : COR.cinza;
      doc.setFillColor(232, 234, 240); doc.roundedRect(xx, yy - 3, larg - (xx - M) - 4, 3, 1.5, 1.5, 'F');
      doc.setFillColor(corForm[0], corForm[1], corForm[2]);
      doc.roundedRect(xx, yy - 3, Math.max(3, (larg - (xx - M) - 4) * (p.formacaoPct / 100)), 3, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(corForm[0], corForm[1], corForm[2]);
      doc.text(`Formação do Executivo Ideal: ${p.formacaoPct}%`, xx, yy + 4.5);
      yy += 9;
      if (p.formacaoMensagem) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 135);
        const linhas = doc.splitTextToSize(paraPdf(p.formacaoMensagem), larg - (xx - M) - 4);
        doc.text(linhas, xx, yy); yy += linhas.length * 3.4;
      }
    }
    if (p.roda) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(70, 70, 85);
      doc.text(paraPdf(`${p.roda.emoji} ${p.roda.rotulo}`), xx, yy + 2);
    }

    // legenda dos 5 eixos, embaixo da roda (dentro do painel)
    let ly = y + ALT_PAINEL - 5;
    const lx0 = M + 6;
    const passo = (RAIO_RODA * 2 + 8) / Math.max(1, p.eixos.length);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.3);
    p.eixos.forEach((e, i) => {
      const fraco = e.atual < e.alvo;
      const c = fraco ? COR.vermelho : COR.verde;
      doc.setTextColor(c[0], c[1], c[2]);
      doc.text(paraPdf(`${e.emoji}${Math.round(e.atual)}%`), lx0 + i * passo, ly, { align: 'left' });
    });

    y += ALT_PAINEL + 6;
  }

  // ── os blocos ──
  for (const b of rel.blocos) {
    garantir(16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 135);
    doc.text(paraPdf(b.titulo).toUpperCase(), M, y, { charSpace: 0.6 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(70, 70, 85);
    doc.text(paraPdf(b.resumo), W - M, y, { align: 'right' });
    y += 2; doc.setDrawColor(225, 227, 235); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 5;

    if (b.linhas.length === 0) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(150, 150, 160);
      doc.text(b.id === 'producao' ? '' : 'nada aqui', M + 5, y); y += b.id === 'producao' ? 2 : 6;
    }
    for (const l of b.linhas) {
      const apoio = l.apoio ? doc.splitTextToSize(paraPdf(l.apoio), larg - 12 - (l.estado ? 38 : 0)) : [];
      const alt = 5 + apoio.length * 3.6 + (typeof l.pct === 'number' ? 3 : 0);
      garantir(alt + 1);
      bola(M + 2.5, y - 1.1, l.cor || l.estado?.cor);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(20, 20, 30);
      const t = doc.splitTextToSize(paraPdf(l.texto), larg - 12 - (l.estado ? 38 : 0));
      doc.text(t[0], M + 7, y);
      if (l.estado) {
        const c = COR[l.estado.cor] || COR.cinza; doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(c[0], c[1], c[2]);
        doc.text(paraPdf(l.estado.rotulo).toUpperCase().slice(0, 34), W - M, y, { align: 'right' });
      }
      let yy = y + 3.8;
      if (apoio.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 110, 125); doc.text(apoio, M + 7, yy); yy += apoio.length * 3.6; }
      if (typeof l.pct === 'number') {
        doc.setFillColor(232, 234, 240); doc.roundedRect(M + 7, yy - 1.5, larg - 14, 1.6, 0.8, 0.8, 'F');
        const c = COR[l.cor] || COR.azul; doc.setFillColor(c[0], c[1], c[2]);
        if (l.pct > 0) doc.roundedRect(M + 7, yy - 1.5, Math.max(1.6, (larg - 14) * (l.pct / 100)), 1.6, 0.8, 0.8, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(c[0], c[1], c[2]);
        doc.text(`${l.pct}%`, W - M, yy - 0.4, { align: 'right' });
        yy += 3;
      }
      y = yy + 1.8;
    }
    y += 5;
  }
  rodape();
  return doc;
}

export default function PdfExecutivo({ relatorio }) {
  const [gerando, setGerando] = useState(false);
  const gerar = async () => {
    if (!relatorio || gerando) return;
    setGerando(true);
    try {
      const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), carregarLogo()]);
      const doc = await desenharPdf(relatorio, { jsPDF, logo });
      const nome = relatorio.nomeArquivo;
      const blob = doc.output('blob');
      const arquivo = typeof File !== 'undefined' ? new File([blob], nome, { type: 'application/pdf' }) : null;
      if (arquivo && typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [arquivo] })) {
        try { await navigator.share({ files: [arquivo], title: relatorio.titulo, text: `${relatorio.pessoa.nome} · ${relatorio.periodoRotulo}` }); setGerando(false); return; } catch (e) { if (e?.name === 'AbortError') { setGerando(false); return; } }
      }
      doc.save(nome);
      toast.success(`PDF de ${relatorio.pessoa.nome.split(' ')[0]} pronto`);
    } catch (e) {
      console.error(e); toast.error('Não gerou o PDF — tenta de novo');
    }
    setGerando(false);
  };
  const copiar = async () => {
    if (!relatorio) return;
    const texto = textoDoRelatorio(relatorio);
    try { await navigator.clipboard.writeText(texto); toast.success('Texto copiado — cola no WhatsApp'); } catch { toast.error('Não copiou — o navegador bloqueou'); }
  };
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={gerar} disabled={!relatorio || gerando} title="Gerar o PDF deste executivo pra compartilhar" className={`inline-flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/10 disabled:opacity-40`} data-teste="pdf-executivo">
        {gerando ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />} PDF
      </button>
      <button type="button" onClick={copiar} disabled={!relatorio} title="Copiar o relatório em texto pra colar no WhatsApp" className="inline-flex items-center rounded-full border border-white/10 p-1.5 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40" data-teste="pdf-texto">
        <MessageCircle className="w-3 h-3" />
      </button>
    </span>
  );
}
