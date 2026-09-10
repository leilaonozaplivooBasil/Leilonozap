import React, { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2 } from 'lucide-react';
import { gerarLaudoPdf } from '@/lib/laudoEmPdf';

// 📄 O BOTÃO DO LAUDO — a Fase 2 (10/09/2026).
//
// Dono: serve pra "quando o usuário reclamar de algum erro ou problema,
// podermos ver na hora se foi mal uso do usuário ou se de fato é erro".
//
// Aqui só mora o clique. Quem desenha o PDF é `src/lib/laudoEmPdf.js` e quem
// escreve as frases é `src/lib/relatorioComprovacoes.js` — os dois testáveis
// em node. Foi assim de propósito: o risco deste recurso está no que o papel
// DIZ, e o que ele diz precisa morar onde tem teste.
//
// 🔴 NÃO É o gerador do Financeiro (FinancialPDFGenerator.jsx). Aquele é zona
// proibida por ordem do dono e não foi tocado; este é caminho novo, que só
// reaproveita a mesma biblioteca (jsPDF, já no projeto).

/**
 * O botão. Discreto de propósito: fica ao lado do nome na fila, não vira
 * chamariz. Quem precisa dele já está com a reclamação aberta na mão.
 */
export default function BotaoLaudoPdf({ itens = [], data = null, pessoaId = null, nome = '', className = '' }) {
  const [gerando, setGerando] = useState(false);
  const clicar = (e) => {
    e.stopPropagation();
    if (gerando) return;
    setGerando(true);
    try {
      const arquivo = gerarLaudoPdf({ itens, data, pessoaId, nome });
      toast.success(`📄 ${arquivo}`);
    } catch (erro) {
      console.error('[laudo] falhou ao gerar o PDF:', erro);
      toast.error('Não deu pra gerar o laudo agora.');
    } finally {
      setGerando(false);
    }
  };
  return (
    <button
      type="button"
      onClick={clicar}
      disabled={gerando || !itens.length}
      title={`Laudo em PDF de ${nome || 'esta pessoa'} neste dia`}
      className={`shrink-0 inline-flex items-center gap-1 rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] font-bold text-white/50 hover:text-white hover:border-white/35 disabled:opacity-30 ${className}`}
      data-teste="laudo-pdf"
    >
      {gerando ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} laudo
    </button>
  );
}
