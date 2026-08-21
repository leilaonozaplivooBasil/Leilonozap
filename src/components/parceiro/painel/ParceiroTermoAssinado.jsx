import React, { useState } from 'react';
import { ShieldCheck, Download, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';

const formatarData = (iso) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch { return iso; }
};

// 🆔 quem está pedindo o documento — o servidor confere se pode ver.
const idDoUsuarioLogado = () => {
  try { return JSON.parse(localStorage.getItem('currentUser') || '{}')?.id || ''; }
  catch { return ''; }
};

// ✅ Comprovante do termo já assinado + download do PDF do termo.
export default function ParceiroTermoAssinado({ registro, persistido = true }) {
  const [gerando, setGerando] = useState(false);

  const nomeArquivo = 'Termo_Confidencialidade_LeilaoNoZap.pdf';

  // 📤 Entrega o PDF ao parceiro: no celular tenta o compartilhar nativo,
  // no desktop baixa. Mesmo comportamento de antes — só virou função.
  const entregar = async (blob) => {
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], nomeArquivo, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Termo de Confidencialidade' });
          toast.success('Termo compartilhado');
          return;
        }
      } catch { /* usuário cancelou — segue para download */ }
    }
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = nomeArquivo;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove(); }, 200);
    toast.success('Termo baixado em PDF');
  };

  // 🗄️ Via oficial arquivada no cofre privado. Link assinado de 5 minutos,
  // liberado pelo servidor só para o próprio signatário ou um admin.
  // Devolve true se conseguiu entregar; false = quem chamou usa a reserva.
  const tentarViaArquivada = async () => {
    const assinaturaId = registro?.id;
    const solicitanteId = idDoUsuarioLogado();
    if (!assinaturaId || !solicitanteId) return false;
    try {
      const resp = await plataforma.functions.invoke('getDocumentoAssinadoUrl', {
        assinatura_id: assinaturaId,
        solicitante_id: solicitanteId,
      });
      const url = resp?.url || resp?.data?.url;
      if (!url) return false;
      const r = await fetch(url);
      if (!r.ok) return false;
      const blob = await r.blob();
      if (!blob || blob.size === 0) return false;
      await entregar(blob);
      return true;
    } catch {
      return false; // silencioso: cai na reserva sem assustar o parceiro
    }
  };

  const baixar = async () => {
    setGerando(true);
    try {
      // 1) via oficial do cofre — 2) reserva: gerar na hora
      if (await tentarViaArquivada()) return;

      const resp = await plataforma.functions.invoke('generateNdaPDF', {
        format: 'base64',
        partner_name: registro?.nome,
        partner_cpf: registro?.cpf,
        partner_email: registro?.email,
        assinado_em: registro?.assinado_em,
        ip: registro?.ip,
        user_agent: registro?.user_agent,
        hash: registro?.hash_documento || registro?.hash,
        codigo_verificacao: registro?.codigo_verificacao,
        versao: registro?.versao_contrato || registro?.versao,
        signature_base64: registro?.assinatura_png,
        doc_identidade_url: registro?.doc_identidade_url,
        doc_cpf_url: registro?.doc_cpf_url,
      });
      const pdfBase64 = resp?.data?.pdf_base64 || resp?.pdf_base64;
      if (!pdfBase64) throw new Error(resp?.error || 'PDF não gerado');

      const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
      const bytes = atob(base64Data);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      await entregar(new Blob([arr], { type: 'application/pdf' }));
    } catch (e) {
      toast.error('Não foi possível gerar o PDF: ' + (e?.message || 'erro'));
    } finally {
      setGerando(false);
    }
  };

  return (
    <section className="border border-pc-ouro/40 bg-pc-preto-2 p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 border border-pc-ouro/50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-pc-ouro">
            <ShieldCheck className="h-3 w-3" strokeWidth={2} /> Termo assinado
          </span>
          <h2 className="mt-3 text-xl font-bold text-pc-tinta sm:text-2xl">Termo de confidencialidade</h2>
          <p className="mt-1 text-sm text-pc-tinta-fraca">
            Assinado em <span className="font-semibold text-pc-tinta">{formatarData(registro?.assinado_em)}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={baixar}
          disabled={gerando}
          className="flex min-h-[48px] shrink-0 items-center justify-center gap-2 border border-pc-ouro px-5 text-[11px] font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto disabled:opacity-60"
        >
          {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {gerando ? 'Gerando...' : 'Baixar PDF'}
        </button>
      </div>

      {!persistido && (
        <p className="mt-4 flex items-start gap-2 border border-yellow-600/40 bg-yellow-950/20 p-3 text-xs leading-relaxed text-yellow-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          A assinatura foi feita, mas o registro no servidor não foi confirmado. Baixe o PDF
          e avise o suporte para que o aceite seja arquivado.
        </p>
      )}

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Signatário', registro?.nome],
          ['CPF/CNPJ', registro?.cpf],
          ['Código de verificação', registro?.codigo_verificacao],
          ['Versão do termo', registro?.versao_contrato || registro?.versao],
          ['IP de origem', registro?.ip],
          ['Vigência do sigilo', '5 anos após o último acesso'],
          ['Identidade anexada', registro?.doc_identidade_url ? 'Sim' : 'Não'],
          ['CPF anexado', registro?.doc_cpf_url ? 'Sim' : 'Não'],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="min-w-0">
            <dt className="text-[9px] font-semibold uppercase tracking-[0.15em] text-pc-tinta-fraca">{rotulo}</dt>
            <dd className="mt-1 break-words text-sm text-pc-tinta">{valor || '-'}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 border-t border-pc-borda pt-4 text-[11px] leading-relaxed text-pc-tinta-fraca">
        Assinatura eletrônica registrada nos termos da Lei nº 14.063/2020 e da MP nº 2.200-2/2001,
        com data e hora do servidor, endereço IP, dispositivo, hash SHA-256 e código de verificação.
      </p>
    </section>
  );
}