import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Send, Loader2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import { arquivosDoColar } from '@/lib/colarImagem';
import { ROTULO_TIPO, viraTrabalho, validarChamado, LIMITE_PERGUNTA } from '@/lib/tiraDuvidas';
import { vibrar, VIBRA_TOQUE, VIBRA_CONCLUIU, VIBRA_ERRO } from '@/lib/xgame';
import useDitado from '@/hooks/useDitado';
import BotaoDitado from '@/components/common/BotaoDitado';
import { juntarTexto } from '@/lib/ditado';

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
//
// 🎙️ 09/09/2026 — o gravador SAIU daqui pro `useDitado`, porque o dono pediu o
// mesmo microfone em módulos do X-GAME. Eram ~60 linhas de refs e limpeza; ter
// quatro cópias delas seria ter quatro cópias do bug de microfone-que-fica-
// ligado. O comportamento desta tela não mudou nada: mesmo teto, mesmo texto
// caindo no campo pra revisão, mesma volta pro teclado quando falha.

export default function TiraDuvidas({ usuario = null, pagina = 'Guia do X-GAME' }) {
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);   // {resposta, tipo, ...}
  const [aviso, setAviso] = useState('');

  const galeriaRef = useRef(null);

  // 🎙️ o ditado: o texto cai NO CAMPO (não sai como mensagem), pra pessoa ler
  // o que o computador entendeu e corrigir antes de perguntar. O áudio em si
  // esta tela descarta — dúvida não vira acervo.
  const ditado = useDitado({
    onTexto: (t) => setTexto((atual) => juntarTexto(atual, t, LIMITE_PERGUNTA)),
  });
  const transcrevendo = ditado.transcrevendo;

  useEffect(() => {
    if (!arquivo) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(arquivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const colarPrint = (e) => {
    const imgs = arquivosDoColar(e.clipboardData);
    if (imgs.length) { e.preventDefault(); setArquivo(imgs[0]); vibrar(VIBRA_TOQUE); }
  };

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
  // o erro do microfone e o aviso da tela dividem a MESMA faixa: dois lugares
  // pra mensagem de erro é como não ter nenhum — a pessoa lê um e ignora o outro.
  const avisoNaTela = aviso || ditado.erro;

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

        <BotaoDitado
          ditado={ditado}
          rotulo="falar"
          rotuloGravando="parar"
          className="border border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10 !rounded-lg !px-2.5 !py-1.5 !text-[11px]"
        />
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

      {avisoNaTela && (
        <p className="mt-2 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-400/25 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5" data-teste="tira-duvidas-aviso">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {avisoNaTela}
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
