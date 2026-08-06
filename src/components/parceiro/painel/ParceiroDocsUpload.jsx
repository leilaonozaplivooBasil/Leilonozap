import React, { useRef, useState } from 'react';
import { Upload, Check, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// 🪪 Envio dos documentos de identificação exigidos para validar o termo.
// Um card por documento. Aceita foto (câmera do celular) ou PDF.
function CampoDoc({ rotulo, ajuda, valor, onEnviado, userId, chave }) {
  const inputRef = useRef(null);
  const [enviando, setEnviando] = useState(false);

  const selecionar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Envie até 10 MB.');
      return;
    }
    setEnviando(true);
    try {
      const limpo = (file.name || 'doc').replace(/[^a-zA-Z0-9._-]/g, '_');
      const { file_url } = await base44.integrations.Core.UploadFile({
        file,
        path: `parceiro-nda/${userId || 'sem-id'}/${chave}_${Date.now()}_${limpo}`,
      });
      if (!file_url) throw new Error('Upload não retornou o arquivo');
      onEnviado(file_url);
      toast.success(`${rotulo} enviado`);
    } catch (err) {
      toast.error('Não foi possível enviar: ' + (err?.message || 'erro desconhecido'));
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={`border p-4 ${valor ? 'border-pc-ouro/60 bg-pc-preto' : 'border-pc-borda bg-pc-preto'}`}>
      <div className="flex items-start gap-2">
        {valor ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-pc-ouro" strokeWidth={2.5} />
        ) : (
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-pc-tinta-fraca" strokeWidth={1.8} />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-pc-tinta">{rotulo}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-pc-tinta-fraca">{ajuda}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={selecionar}
        className="hidden"
      />
      <button
        type="button"
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
        className={`mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 border px-4 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
          valor
            ? 'border-pc-borda text-pc-tinta-fraca hover:bg-pc-preto-2'
            : 'border-pc-ouro text-pc-ouro hover:bg-pc-ouro hover:text-pc-preto'
        } disabled:opacity-60`}
      >
        {enviando ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
        ) : (
          <><Upload className="h-4 w-4" /> {valor ? 'Trocar arquivo' : 'Enviar arquivo'}</>
        )}
      </button>

      {valor && (
        <a
          href={valor}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block truncate text-[11px] text-pc-ouro underline underline-offset-2"
        >
          Ver arquivo enviado
        </a>
      )}
    </div>
  );
}

export default function ParceiroDocsUpload({ userId, docIdentidade, docCpf, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CampoDoc
        chave="identidade"
        rotulo="Documento de identidade"
        ajuda="RG, CNH ou passaporte. Foto legível da frente (e verso, se houver) ou PDF."
        valor={docIdentidade}
        userId={userId}
        onEnviado={(url) => onChange({ docIdentidade: url })}
      />
      <CampoDoc
        chave="cpf"
        rotulo="Comprovação de CPF"
        ajuda="Cartão CPF, comprovante da Receita Federal ou CNH com o CPF visível."
        valor={docCpf}
        userId={userId}
        onEnviado={(url) => onChange({ docCpf: url })}
      />
    </div>
  );
}