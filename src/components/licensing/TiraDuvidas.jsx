import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, ImagePlus, Send, Loader2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import { arquivosDoColar } from '@/lib/colarImagem';
import { ROTULO_TIPO, viraTrabalho, validarChamado, LIMITE_PERGUNTA } from '@/lib/tiraDuvidas';
import { vibrar, VIBRA_TOQUE, VIBRA_CONCLUIU, VIBRA_ERRO } from '@/lib/xgame';

// 🆘 TIRA DÚVIDAS 24h — o campo do topo do guia (pedido do dono, 06/09/2026:
// "no topo da página, de preferência no hero... com campo para o usuário
// escrever o texto ou áudio, anexar imagens (para prints de tela e etc). E ali
// mesmo responder a pergunta ou reportar um bug, erro, correção, otimização").
//
// UM CAMPO SÓ, DE PROPÓSITO. A tentação era três abas — "perguntar", "reportar
// bug", "sugerir melhoria". Quem não tem intimidade com tela não sabe em qual
// aba o problema dela mora, e escolher errado já é um jeito de desistir. Ela
// conta o que houve do jeito dela; QUEM classifica é a IA.
//
// O MICROFONE SÓ APARECE SE A TRANSCRIÇÃO ESTIVER LIGADA (a rota responde no
// GET). Botão que existe e falha é pior que botão que não existe — foi a lição
// do `transcribeAudio`, que tinha tela chamando uma rota inexistente.

const TETO_GRAVACAO_SEG = 120;

export default function TiraDuvidas({ usuario = null, pagina = 'Guia do X-GAME' }) {
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);   // {resposta, tipo, ...}
  const [aviso, setAviso] = useState('');

  const [temMicrofone, setTemMicrofone] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [segundos, setSegundos] = useState(0);

  const galeriaRef = useRef(null);
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const relogioRef = useRef(null);

  // a rota diz se a chave existe; sem ela o microfone nem é desenhado
  useEffect(() => {
    let vivo = true;
    fetch('/api/functions/transcreverAudio')
      .then((r) => r.json())
      .then((j) => { if (vivo) setTemMicrofone(!!j?.disponivel); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!arquivo) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(arquivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  // limpa gravação e câmera se a pessoa sair no meio
  useEffect(() => () => {
    try { recRef.current?.stop?.(); } catch { /* já parou */ }
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    clearInterval(relogioRef.current);
  }, []);

  const colarPrint = (e) => {
    const imgs = arquivosDoColar(e.clipboardData);
    if (imgs.length) { e.preventDefault(); setArquivo(imgs[0]); vibrar(VIBRA_TOQUE); }
  };

  const pararGravacao = useCallback(() => {
    try { recRef.current?.stop?.(); } catch { /* já parou */ }
    clearInterval(relogioRef.current);
    setGravando(false);
  }, []);

  const transcrever = useCallback(async (blob) => {
    setTranscrevendo(true);
    try {
      const form = new FormData();
      form.append('audio', blob, 'audio.webm');
      const r = await fetch('/api/functions/transcreverAudio', { method: 'POST', body: form });
      const j = await r.json().catch(() => null);
      if (!j?.ok) { setAviso(j?.error || 'Não consegui entender o áudio. Tenta escrever?'); vibrar(VIBRA_ERRO); return; }
      // o áudio vira TEXTO NO CAMPO, e não uma mensagem que sai direto: a
      // pessoa lê o que o computador entendeu e corrige antes de mandar.
      setTexto((t) => (t ? `${t} ${j.texto}` : j.texto).slice(0, LIMITE_PERGUNTA));
      setAviso('');
    } catch {
      setAviso('Falhou ao transcrever. Tenta escrever a dúvida?');
    } finally {
      setTranscrevendo(false);
    }
  }, []);

  const gravar = useCallback(async () => {
    if (gravando) { pararGravacao(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const pedacos = [];
      const rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : undefined);
      rec.ondataavailable = (ev) => { if (ev.data?.size) pedacos.push(ev.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(pedacos, { type: rec.mimeType || 'audio/webm' });
        if (blob.size > 1000) transcrever(blob);
      };
      recRef.current = rec;
      rec.start(1000);
      setGravando(true); setSegundos(0); setAviso('');
      vibrar(VIBRA_TOQUE);
      relogioRef.current = setInterval(() => setSegundos((s) => {
        if (s + 1 >= TETO_GRAVACAO_SEG) pararGravacao();
        return s + 1;
      }), 1000);
    } catch {
      setAviso('Não consegui abrir o microfone. Libere o acesso ou escreva a sua dúvida.');
      setTemMicrofone(false);
    }
  }, [gravando, pararGravacao, transcrever]);

  const enviar = async () => {
    const checagem = validarChamado({ pergunta: texto, imagemUrl: arquivo ? 'x' : '' });
    if (!checagem.valido) { setAviso(checagem.motivo); vibrar(VIBRA_ERRO); return; }
    setEnviando(true); setAviso(''); setResultado(null);
    try {
      let imagemUrl = null;
      if (arquivo) {
        const up = await plataforma.integrations.Core.UploadFile({ file: arquivo });
        imagemUrl = up?.file_url || up?.url || null;
      }
      const r = await fetch('/api/functions/tiraDuvidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pergunta: texto.trim(),
          imagem_url: imagemUrl,
          entrada: arquivo ? 'imagem' : 'texto',
          pagina,
          usuario_id: usuario?.id || null,
          usuario_nome: usuario?.full_name || usuario?.nome || null,
        }),
      });
      const j = await r.json().catch(() => null);
      if (!j?.resposta) { setAviso(j?.error || 'Deu um erro aqui. Tenta de novo?'); vibrar(VIBRA_ERRO); return; }
      setResultado(j);
      setTexto(''); setArquivo(null);
      vibrar(VIBRA_CONCLUIU);
    } catch {
      setAviso('Deu um erro aqui. Tenta de novo em instantes?');
      vibrar(VIBRA_ERRO);
    } finally {
      setEnviando(false);
    }
  };

  const ocupado = enviando || transcrevendo;
  const mmss = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;

  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-3 sm:p-4" data-teste="tira-duvidas">
      <div className="flex items-baseline gap-2 flex-wrap mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Tira Dúvidas 24h</p>
        <span className="text-[10px] text-white/40">pergunte do seu jeito — escreva, fale ou mande um print</span>
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_PERGUNTA))}
        onPaste={colarPrint}
        disabled={ocupado}
        rows={3}
        placeholder="Ex.: o botão de concluir não acende, mesmo com tudo preenchido"
        data-teste="tira-duvidas-texto"
        className="xeos-cru w-full rounded-xl bg-white/[0.06] border border-white/15 text-white text-sm px-3 py-2.5 outline-none focus:border-white/40 placeholder:text-white/30 resize-y min-h-[76px]"
      />

      {preview && (
        <div className="mt-2 flex items-center gap-2">
          <img src={preview} alt="o print que você anexou" className="h-16 w-16 object-cover rounded-lg border border-white/15" />
          <button type="button" onClick={() => setArquivo(null)} className="text-[11px] text-white/45 hover:text-white/80 flex items-center gap-1">
            <X className="w-3 h-3" /> tirar o print
          </button>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => galeriaRef.current?.click()}
          disabled={ocupado}
          title="anexar um print da tela"
          data-teste="tira-duvidas-print"
          className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[11px] text-white/80 hover:bg-white/10 disabled:opacity-40"
        >
          <ImagePlus className="w-3.5 h-3.5" /> print
        </button>

        {temMicrofone && (
          <button
            type="button"
            onClick={gravar}
            disabled={enviando || transcrevendo}
            title={gravando ? 'parar e transcrever' : 'gravar um áudio'}
            data-teste="tira-duvidas-microfone"
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] disabled:opacity-40 ${gravando ? 'border-red-400/60 bg-red-500/20 text-red-100' : 'border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10'}`}
          >
            {gravando ? (<><Square className="w-3.5 h-3.5" /> parar · {mmss}</>) : (<><Mic className="w-3.5 h-3.5" /> falar</>)}
          </button>
        )}
        {transcrevendo && <span className="text-[11px] text-white/50 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> escrevendo o que você falou…</span>}

        <div className="flex-1" />

        <button
          type="button"
          onClick={enviar}
          disabled={ocupado}
          data-teste="tira-duvidas-enviar"
          className="flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
        >
          {enviando ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> pensando…</>) : (<><Send className="w-3.5 h-3.5" /> perguntar</>)}
        </button>
      </div>
      <input ref={galeriaRef} type="file" accept="image/*" hidden onChange={(e) => setArquivo(e.target.files?.[0] || null)} />

      {aviso && (
        <p className="mt-2 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-400/25 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5" data-teste="tira-duvidas-aviso">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {aviso}
        </p>
      )}

      {resultado?.resposta && (
        <div className="mt-3 rounded-xl border border-white/12 bg-black/25 p-3" data-teste="tira-duvidas-resposta">
          <p className="text-sm text-white/90 whitespace-pre-line">{resultado.resposta}</p>
          {/* 🧾 quando não é dúvida e sim problema, a pessoa VÊ que o recado
              virou chamado. Sem isso ela não sabe se alguém ficou sabendo. */}
          {viraTrabalho(resultado.tipo) && (
            <p className="mt-2 text-[11px] text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              registrado como <strong>{ROTULO_TIPO[resultado.tipo]}</strong> — o time vai olhar
            </p>
          )}
          {resultado.ia === false && (
            <p className="mt-2 text-[11px] text-white/45">o atendimento automático está fora do ar — o seu recado ficou guardado</p>
          )}
        </div>
      )}
    </div>
  );
}
