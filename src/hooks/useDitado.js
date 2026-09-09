import { useCallback, useEffect, useRef, useState } from 'react';
import {
  TETO_GRAVACAO_SEG, MENSAGENS,
  formatoDeGravacao, gravacaoUtil, bateuOTeto, extensaoDoMime,
} from '@/lib/ditado';

// 🎙️ useDitado — o microfone do sistema, em UM lugar só.
//
// Extraído do Tira Dúvidas pra atender o pedido do dono de levar o áudio pros
// módulos do X-GAME. Aqui mora tudo que é perigoso repetir: abrir o microfone,
// juntar os pedaços, PARAR OS TRACKS e limpar o cronômetro. Microfone que fica
// ligado depois de fechar a tela acende a bolinha vermelha do navegador — a
// pessoa não vê um bug, vê um app espionando ela.
//
// COMO USAR:
//   const ditado = useDitado({ onTexto: (texto, blob) => ... });
//   {ditado.disponivel && <BotaoDitado ditado={ditado} />}
//
// `onTexto` recebe o texto E o áudio: quem chama decide se guarda o arquivo
// (o Momento de Gratidão guarda; o Tira Dúvidas descarta). O hook não decide
// isso por ninguém.

// A rota diz se a chave existe. UMA pergunta por carregamento de página, não
// uma por componente: com o microfone em 5 telas, 5 componentes montados ao
// mesmo tempo fariam 5 requisições idênticas.
let promessaDisponivel = null;
function perguntarSeTemMicrofone() {
  if (!promessaDisponivel) {
    promessaDisponivel = fetch('/api/functions/transcreverAudio')
      .then((r) => r.json())
      .then((j) => !!j?.disponivel)
      .catch(() => false);
  }
  return promessaDisponivel;
}

/** Só pros testes: esquece a resposta guardada. */
export function _limparCacheDoDitado() { promessaDisponivel = null; }

export default function useDitado({ onTexto, tetoSeg = TETO_GRAVACAO_SEG } = {}) {
  const [disponivel, setDisponivel] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState('');

  const recRef = useRef(null);
  const streamRef = useRef(null);
  const relogioRef = useRef(null);
  // onTexto costuma ser função nova a cada render; guardar na ref evita
  // reconstruir `gravar` (e com ele o MediaRecorder) a cada tecla digitada.
  const aoTextoRef = useRef(onTexto);
  aoTextoRef.current = onTexto;

  useEffect(() => {
    let vivo = true;
    perguntarSeTemMicrofone().then((tem) => { if (vivo) setDisponivel(tem); });
    return () => { vivo = false; };
  }, []);

  // 🧹 A LIMPEZA. É por causa dela que este hook existe: sair da tela no meio
  // da gravação tem que desligar o microfone de verdade — parar o recorder NÃO
  // basta, os tracks do stream continuam vivos e a bolinha vermelha fica acesa.
  useEffect(() => () => {
    try { recRef.current?.stop?.(); } catch { /* já parou */ }
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    clearInterval(relogioRef.current);
  }, []);

  const parar = useCallback(() => {
    try { recRef.current?.stop?.(); } catch { /* já parou */ }
    clearInterval(relogioRef.current);
    setGravando(false);
  }, []);

  const transcrever = useCallback(async (blob) => {
    setTranscrevendo(true);
    try {
      const form = new FormData();
      form.append('audio', blob, `audio.${extensaoDoMime(blob.type)}`);
      const r = await fetch('/api/functions/transcreverAudio', { method: 'POST', body: form });
      const j = await r.json().catch(() => null);
      if (!j?.ok) { setErro(j?.error || MENSAGENS.falhou); return; }
      setErro('');
      // texto E áudio: quem chamou decide o que fazer com cada um
      aoTextoRef.current?.(j.texto, blob);
    } catch {
      setErro(MENSAGENS.falhou);
    } finally {
      setTranscrevendo(false);
    }
  }, []);

  const alternar = useCallback(async () => {
    if (gravando) { parar(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const pedacos = [];
      const mime = formatoDeGravacao(window.MediaRecorder?.isTypeSupported);
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (ev) => { if (ev.data?.size) pedacos.push(ev.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(pedacos, { type: rec.mimeType || mime || 'audio/webm' });
        // clique sem querer não vira chamada paga ao Whisper
        if (gravacaoUtil(blob)) transcrever(blob);
        else setErro(MENSAGENS.semFala);
      };
      recRef.current = rec;
      rec.start(1000);
      setGravando(true); setSegundos(0); setErro('');
      relogioRef.current = setInterval(() => setSegundos((s) => {
        const proximo = s + 1;
        if (bateuOTeto(proximo, tetoSeg)) parar();
        return proximo;
      }), 1000);
    } catch {
      // Permissão negada ou aparelho sem microfone: some com o botão em vez de
      // deixar a pessoa clicando num botão que nunca vai funcionar.
      setErro(MENSAGENS.semMicrofone);
      setDisponivel(false);
    }
  }, [gravando, parar, transcrever, tetoSeg]);

  return {
    disponivel, gravando, transcrevendo, segundos, erro, tetoSeg,
    alternar, parar,
    limparErro: useCallback(() => setErro(''), []),
  };
}
