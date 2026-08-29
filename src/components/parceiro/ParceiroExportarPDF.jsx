import React, { useState, useCallback } from 'react';
import { FileDown, Loader2 } from 'lucide-react';

// 📄 EXPORTAR A APRESENTAÇÃO EM PDF (28/08/2026, pedido do dono)
//
// Quem abre /Partners precisa conseguir levar a apresentação embora — em reunião,
// por e-mail, impressa. Este botão faz isso.
//
// ── POR QUE window.print() E NÃO html2canvas + jsPDF ───────────────────────────
// As duas libs já existem no projeto (usadas no PDF do Financeiro), então a escolha
// aqui foi deliberada, não falta de ferramenta. Nesta página elas seriam a opção pior:
//
//   • A página tem 12 seções longas. html2canvas rasteriza tudo num canvas único —
//     em celular isso estoura memória e trava a aba.
//   • As imagens dos canais vêm de /midia. Qualquer asset servido de outra origem
//     "suja" o canvas (tainted) e a exportação falha inteira, sem aviso útil.
//   • O resultado seria uma IMAGEM dentro de um PDF: texto não selecionável, não
//     pesquisável, arquivo de vários MB. Ruim para um documento institucional que
//     vai ser lido, citado e encaminhado.
//
// window.print() usa o motor de impressão do próprio navegador: PDF vetorial, texto
// selecionável, arquivo leve, funciona em qualquer aparelho, e o visitante escolhe
// "Salvar como PDF" (ou manda direto para a impressora, se for o caso). O custo é
// passar pelo diálogo do navegador — aceitável perto do que se ganha.
//
// ── O QUE ESTA FUNÇÃO PREPARA ANTES DE IMPRIMIR ───────────────────────────────
// Sem esta preparação o PDF sai com buracos. Duas causas reais:
//
//   ① As imagens da página são loading="lazy". Quem clica em exportar sem ter rolado
//      até o fim tem imagens que NUNCA foram baixadas — elas sairiam em branco.
//      Aqui elas viram eager e a função espera todas terminarem.
//   ② O roadmap anima por scroll (framer-motion): o que ainda não entrou na tela está
//      com opacity 0 / transform aplicado. Isso é neutralizado no CSS de impressão
//      (bloco `@media print` escopado em `body.pc-papel`, em src/index.css) — sem ele,
//      seções inteiras sairiam invisíveis no PDF.
//
// A versão para papel inteira mora naquele bloco: fundo branco, tinta preta, imagem
// decorativa fora, a roda do ciclo trocada pela lista das cinco etapas. Este arquivo
// só prepara e chama a impressão — não conhece diagramação.
//
// A classe `pc-imprimindo` fica no <body> durante a preparação, para quem precisar
// distinguir "impressão pelo botão" de um Ctrl+P direto.
export default function ParceiroExportarPDF() {
  const [preparando, setPreparando] = useState(false);

  const exportar = useCallback(async () => {
    if (preparando) return;
    setPreparando(true);
    document.body.classList.add('pc-imprimindo');

    try {
      // ① Tira o lazy de todas as imagens e espera o download terminar. Sem timeout
      // a exportação ficaria refém de uma imagem que não responde, então cada uma
      // tem 6s — passou disso, imprime do jeito que estiver em vez de travar.
      const imagens = Array.from(document.images).filter((img) => !img.complete);
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
        img.loading = 'eager';
      });

      await Promise.all(
        imagens.map(
          (img) =>
            new Promise((resolve) => {
              const pronto = () => resolve();
              img.addEventListener('load', pronto, { once: true });
              img.addEventListener('error', pronto, { once: true });
              setTimeout(pronto, 6000);
            })
        )
      );

      // ② Dois frames para o navegador aplicar o CSS de impressão e o relayout das
      // imagens que acabaram de entrar, antes de o diálogo congelar a página.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      window.print();
    } catch (e) {
      console.error('[Partners] falha ao preparar a exportação em PDF:', e);
      // Mesmo com erro na preparação, abre o diálogo: um PDF com uma imagem faltando
      // é melhor que um botão que não faz nada.
      window.print();
    } finally {
      document.body.classList.remove('pc-imprimindo');
      setPreparando(false);
    }
  }, [preparando]);

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={preparando}
      aria-label="Exportar esta apresentação em PDF"
      // Canto inferior ESQUERDO de propósito: os flutuantes do site (voltar ao topo,
      // atendimento) moram na direita. A altura vem da mesma variável do dock deles,
      // então este botão sobe junto nas páginas com barra inferior.
      // ⚠️ Fundo SÓLIDO (bg-pc-preto-2, sem /95): as cores pc-* são `var(--pc-*)` puras no
      // tailwind.config, e o Tailwind não consegue injetar alpha numa var assim — a classe
      // com opacidade simplesmente não é gerada e o botão sairia transparente sobre o
      // conteúdo. Por isso também não há backdrop-blur aqui: sem transparência, não faria nada.
      className="pc-exportar-pdf fixed left-4 z-40 flex min-h-[48px] items-center gap-2 border border-pc-ouro bg-pc-preto-2 px-4 text-xs font-semibold uppercase tracking-[0.15em] text-pc-ouro shadow-lg transition-colors hover:bg-pc-ouro hover:text-pc-preto disabled:cursor-wait disabled:opacity-70 sm:left-6 sm:px-5"
      style={{ bottom: 'var(--nz-dock-b, 1.75rem)' }}
    >
      {preparando ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          Preparando…
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" strokeWidth={1.75} />
          Exportar PDF
        </>
      )}
    </button>
  );
}
