import React, { useRef, useState } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { entenderVideo, recadoDoErro, conferirArquivo, BALDE_VIDEO } from '@/lib/videoDoProduto';
import { recadoDaCapa } from '@/lib/capaDoVideo';
import { olharOComeco } from '@/lib/olharOVideo';

/**
 * CampoDeVideo — anexar arquivo OU colar link, no cadastro do produto.
 *
 * Nasceu inline na Gestão de Estoque (15/09/2026) e virou componente quando a
 * MESMA função precisou existir em "Adicionar ao catálogo" e "Editar produto do
 * catálogo". São três telas que gravam na mesma coluna: se a regra do que é um
 * vídeo válido morar em três lugares, ela vai divergir — e a que divergir grava
 * endereço que some calado no navegador de quem compra.
 *
 * Quem decide o que é válido continua sendo src/lib/videoDoProduto.js. Aqui é
 * só a tela.
 *
 * @param {string[]} valor        lista atual (0 ou 1 item — ver a migração)
 * @param {(lista: string[]) => void} aoMudar
 * @param {boolean} claro         true na tela clara (Catálogo), false na escura
 */
export default function CampoDeVideo({ valor, aoMudar, claro = false }) {
  const [link, setLink] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef(null);
  // 🎬 17/09/2026 — a CAPA do vídeo no WhatsApp é o primeiro quadro do arquivo,
  // e não há como mandar outra (ver src/lib/capaDoVideo.js). Quando o começo
  // está preto, o aviso aparece aqui com o segundo exato para cortar — e o
  // arquivo fica de lado esperando a pessoa decidir.
  const [aviso, setAviso] = useState('');
  const [aguardando, setAguardando] = useState(null);   // File esperando o "subir assim mesmo"
  const [olhando, setOlhando] = useState(false);

  const lista = Array.isArray(valor) ? valor.filter(Boolean) : [];

  const usarLink = () => {
    const r = entenderVideo(link);
    if (!r.ok) { setErro(recadoDoErro(r.motivo)); return; }
    aoMudar([r.url]);
    setLink(''); setErro('');
  };

  // Confere tipo e tamanho ANTES de subir: subir 40 MB pra ser recusado no fim
  // gasta a paciência e a franquia de quem cadastra.
  const subir = async (file) => {
    setErro(''); setAviso(''); setAguardando(null); setEnviando(true);
    try {
      const r = await plataforma.integrations.Core.UploadFile({ file, bucket: BALDE_VIDEO });
      if (r?.file_url) aoMudar([r.file_url]);
      else setErro('O envio terminou sem endereço de arquivo. Tente de novo.');
    } catch (e) {
      console.error('Falha ao enviar vídeo:', e);
      setErro('Não consegui enviar o vídeo. Confira a conexão e tente de novo.');
    }
    setEnviando(false);
  };

  const anexar = async (evento) => {
    const file = evento.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    const conf = conferirArquivo(file);
    if (!conf.ok) { setErro(conf.recado); setAviso(''); setAguardando(null); return; }
    setErro(''); setAviso(''); setAguardando(null);

    // 🎬 OLHA ANTES DE SUBIR. Depois do envio o aviso chegaria tarde: o arquivo
    // já estaria no cofre e a pessoa teria gasto a franquia à toa.
    //
    // 🔴 E NUNCA BLOQUEIA: se a análise falhar (codec desconhecido, arquivo
    // estranho, aba sem foco), `olhou` volta `false` e o envio segue como
    // sempre seguiu. Um aviso que impede de trabalhar quando ele próprio falha
    // é pior do que não existir.
    setOlhando(true);
    const capa = await olharOComeco(file);
    setOlhando(false);
    const recado = capa.olhou ? recadoDaCapa(capa) : '';
    if (recado) { setAviso(recado); setAguardando(file); return; }

    await subir(file);
  };

  const cor = claro
    ? { rotulo: 'text-gray-700', apoio: 'text-gray-500', cartao: 'border-gray-300 bg-gray-50', titulo: 'text-gray-900', campo: 'border-gray-300 bg-white text-gray-900', anexar: 'border-gray-300 text-gray-700 hover:bg-gray-100' }
    : { rotulo: 'text-gray-300', apoio: 'text-gray-400', cartao: 'border-gray-600 bg-gray-900', titulo: 'text-white',     campo: 'border-gray-600 bg-gray-700 text-white', anexar: 'border-gray-600 text-gray-200 hover:bg-gray-700' };

  const NOME_DO_TIPO = { youtube: 'Link do YouTube', vimeo: 'Link do Vimeo', arquivo: 'Vídeo enviado por você' };

  return (
    <div data-teste="campo-de-video">
      <label className={`text-sm font-medium ${cor.rotulo}`}>
        Vídeo do produto<span className={`font-normal ${cor.apoio}`}> — opcional</span>
      </label>

      {lista.length > 0 ? (
        <div className={`mt-2 flex items-center gap-3 rounded-lg border p-3 ${cor.cartao}`} data-teste="video-do-produto">
          <span className="text-2xl" aria-hidden>🎬</span>
          <div className="min-w-0 flex-1">
            <p className={`text-sm ${cor.titulo}`}>
              {NOME_DO_TIPO[entenderVideo(lista[0]).tipo] || 'Vídeo'}
            </p>
            <a
              href={lista[0]} target="_blank" rel="noreferrer" title={lista[0]}
              className="block truncate text-xs text-blue-400 hover:underline"
            >
              {lista[0]}
            </a>
          </div>
          <button
            type="button" onClick={() => { aoMudar([]); setErro(''); }}
            className="shrink-0 rounded px-2 py-1 text-xs text-red-400 hover:text-red-300"
          >
            remover
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              type="url" value={link}
              onChange={(e) => { setLink(e.target.value); setErro(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); usarLink(); } }}
              placeholder="Cole o link do YouTube ou Vimeo"
              className={`min-w-[220px] flex-1 rounded-lg border px-3 py-2 text-sm ${cor.campo}`}
            />
            <button
              type="button" onClick={usarLink} disabled={!link.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Usar link
            </button>
            <button
              type="button" onClick={() => inputRef.current?.click()} disabled={enviando || olhando}
              className={`rounded-lg border px-3 py-2 text-xs disabled:opacity-50 ${cor.anexar}`}
            >
              {olhando ? 'Conferindo o vídeo…' : enviando ? 'Enviando…' : 'Anexar arquivo'}
            </button>
            <input
              ref={inputRef} type="file" accept="video/mp4,video/webm,video/quicktime"
              onChange={anexar} className="hidden"
            />
          </div>
          <p className={`text-xs ${cor.apoio}`}>
            Link do YouTube ou Vimeo, ou um arquivo MP4/WebM/MOV de até 45 MB.
          </p>
        </div>
      )}

      {erro && <p className="mt-2 text-xs text-red-400" data-teste="erro-do-video">{erro}</p>}

      {/* 🎬 O aviso da capa preta. NÃO é erro: o vídeo é válido, só vai ficar
          com miniatura ruim no WhatsApp. Por isso amarelo, e por isso os DOIS
          caminhos ficam abertos — trocar o arquivo ou subir assim mesmo. */}
      {aviso && (
        <div
          data-teste="aviso-da-capa"
          className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
        >
          <p className="text-xs text-amber-300">🎬 {aviso}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setAviso(''); setAguardando(null); inputRef.current?.click(); }}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Escolher outro arquivo
            </button>
            <button
              type="button"
              data-teste="subir-assim-mesmo"
              onClick={() => aguardando && subir(aguardando)}
              disabled={enviando}
              className={`rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50 ${cor.anexar}`}
            >
              {enviando ? 'Enviando…' : 'Subir assim mesmo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
