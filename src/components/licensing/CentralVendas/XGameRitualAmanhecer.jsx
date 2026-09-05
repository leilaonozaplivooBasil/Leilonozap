import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { AVISO_COLAR, LINK_ABRIR_INSTAGRAM } from '@/lib/xgame';

// 🌅 X-GAME — O RITUAL DO AMANHECER (ordem do dono: "tipo um aplicativo de
// espiritualidade, uma musiquinha, pra ele acordar e meditar — nada de lista").
// Às 5h a tarefa de gratidão NÃO abre formulário: abre ESTA experiência —
// céu de amanhecer, som ambiente opcional, 3 momentos guiados (gratidão →
// o sonho dele → a ação do dia) e, no fim, o convite (nunca a cobrança) de
// compartilhar o bom dia. O ritual completo É a comprovação: respostas
// digitadas + horário carimbado — sem foto obrigatória.

// som ambiente: um "pad" suave via WebAudio (dois senos graves + respiração
// lenta de volume). Nada de arquivo, nada de rede — nasce no navegador.
function criarSomAmbiente() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const ganho = ctx.createGain();
  ganho.gain.value = 0.0;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass'; filtro.frequency.value = 500;
  const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 174;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 261.6;
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.012;
  lfo.connect(lfoGain); lfoGain.connect(ganho.gain);
  o1.connect(filtro); o2.connect(filtro); filtro.connect(ganho); ganho.connect(ctx.destination);
  o1.start(); o2.start(); lfo.start();
  ganho.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 2);
  return {
    parar: () => { try { ganho.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6); setTimeout(() => ctx.close(), 800); } catch { /* já fechou */ } },
  };
}

const GRATIDAO_MIN = 20;
const ACAO_MIN = 10;

export default function XGameRitualAmanhecer({ nome, sonho, onFechar, onConcluir }) {
  const [passo, setPasso] = useState(0);
  const [gratidao, setGratidao] = useState('');
  const [acao, setAcao] = useState('');
  const [aviso, setAviso] = useState('');
  const [tocando, setTocando] = useState(false);
  const somRef = useRef(null);

  const alternarSom = () => {
    if (somRef.current) { somRef.current.parar(); somRef.current = null; setTocando(false); return; }
    somRef.current = criarSomAmbiente();
    setTocando(!!somRef.current);
  };
  useEffect(() => () => somRef.current?.parar(), []);

  const bloquearCola = (e) => { e.preventDefault(); setAviso(AVISO_COLAR); setTimeout(() => setAviso(''), 6000); };

  const sonhoTitulo = sonho?.titulo || sonho?.nome || sonho?.texto || '';
  const sonhoImg = sonho?.imagens?.[0] || sonho?.imagem || sonho?.foto || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-b from-[#141432] via-[#5b2a5e] to-[#f59e5b]">
      {/* céu do amanhecer + sol nascendo */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-36 rounded-t-full bg-gradient-to-t from-amber-300/70 to-transparent blur-2xl" />
      <button type="button" onClick={onFechar} className="absolute top-4 right-4 rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10">
        <X className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={alternarSom}
        className={`absolute top-4 left-4 rounded-full px-3 py-1.5 text-xs font-semibold ${tocando ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60 hover:text-white'}`}
      >{tocando ? '🎵 som do amanhecer · tocar/parar' : '🎐 tocar som do amanhecer'}</button>

      <div className="relative w-full max-w-md text-center text-white space-y-6">
        {passo === 0 && (
          <>
            <p className="text-5xl">🌅</p>
            <h2 className="text-2xl font-bold">Bom dia, {nome || 'campeão'}.</h2>
            <p className="text-white/80 text-sm leading-relaxed">
              O dia ainda nem clareou — e você já está aqui.<br />
              <strong>ANTECIPAÇÃO É PODER.</strong>
            </p>
            <p className="text-white/60 text-xs">Respira fundo. São só alguns minutos, com você mesmo.</p>
            <button type="button" onClick={() => setPasso(1)} className="rounded-2xl bg-white text-[#5b2a5e] font-bold px-8 py-3 hover:bg-amber-50">
              Começar o ritual
            </button>
          </>
        )}

        {passo === 1 && (
          <>
            <p className="text-4xl">🙏</p>
            <h2 className="text-xl font-bold">Pelo que você é grato hoje?</h2>
            <textarea
              autoFocus
              value={gratidao}
              onChange={(e) => setGratidao(e.target.value)}
              onPaste={bloquearCola}
              onDrop={bloquearCola}
              placeholder="Escreve com o coração — uma linha já muda o dia."
              className="w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm p-4 min-h-[90px] focus:outline-none focus:border-white/50"
            />
            {aviso && <p className="text-xs font-semibold text-amber-200 bg-white/10 rounded-xl px-3 py-2">{aviso}</p>}
            <button
              type="button"
              disabled={gratidao.trim().length < GRATIDAO_MIN}
              onClick={() => setPasso(2)}
              className="rounded-2xl bg-white text-[#5b2a5e] font-bold px-8 py-3 hover:bg-amber-50 disabled:opacity-40"
            >Continuar</button>
          </>
        )}

        {passo === 2 && (
          <>
            <p className="text-4xl">✨</p>
            <h2 className="text-xl font-bold">Olha o seu sonho.</h2>
            {sonhoImg ? (
              <img src={sonhoImg} alt={sonhoTitulo || 'seu sonho'} className="mx-auto max-h-40 rounded-2xl object-cover shadow-2xl" />
            ) : null}
            {sonhoTitulo ? (
              <p className="text-white/90 text-sm font-semibold">"{sonhoTitulo}"</p>
            ) : (
              <p className="text-white/60 text-sm">Seu Quadro dos Sonhos ainda está vazio — depois do ritual, coloca o primeiro lá no Hábito 1.</p>
            )}
            <p className="text-white/70 text-xs">É por ISSO que você levantou. Qual a UMA coisa que você faz hoje por ele?</p>
            <input
              autoFocus
              value={acao}
              onChange={(e) => setAcao(e.target.value)}
              onPaste={bloquearCola}
              placeholder="a ação de hoje..."
              className="w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm px-4 py-3 focus:outline-none focus:border-white/50"
            />
            <button
              type="button"
              disabled={acao.trim().length < ACAO_MIN}
              onClick={() => setPasso(3)}
              className="rounded-2xl bg-white text-[#5b2a5e] font-bold px-8 py-3 hover:bg-amber-50 disabled:opacity-40"
            >Continuar</button>
          </>
        )}

        {passo === 3 && (
          <>
            <p className="text-4xl">📱</p>
            <h2 className="text-xl font-bold">Compartilha teu bom dia?</h2>
            <p className="text-white/70 text-sm">Convite, não obrigação: um story de bom dia inspira o time inteiro — e vale pontos extras no jogo.</p>
            <a
              href={LINK_ABRIR_INSTAGRAM}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white font-bold px-6 py-3 hover:opacity-90"
            >📱 Postar o bom dia</a>
            <div>
              <button
                type="button"
                onClick={() => onConcluir({ gratidao: gratidao.trim(), acao: acao.trim() })}
                className="mt-2 rounded-2xl bg-white text-[#5b2a5e] font-bold px-8 py-3 hover:bg-amber-50"
              >Concluir o ritual ✔</button>
            </div>
            <p className="text-white/50 text-[11px]">o ritual é a sua comprovação — horário e palavras suas, carimbados</p>
          </>
        )}

        {/* as bolinhas do progresso do ritual */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= passo ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
