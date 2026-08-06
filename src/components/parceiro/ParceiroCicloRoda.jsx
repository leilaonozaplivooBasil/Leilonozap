import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Gauge, ChevronLeft, ChevronRight } from 'lucide-react';

// 🕛 Roda do ciclo operacional — mostrador de 12 meses que gira devagar sozinho.
// Substitui a grade de 5 colunas por leitura de UMA mensagem por vez (mais limpo).
// Pausa no toque, gira no arrasto, acelera em 1x/2x e salta pela marcação.
// Conteúdo vem por prop: este arquivo NÃO conhece nem altera texto de contrato.
// Paleta exclusiva --pc- (página do Parceiro).
const PASSO_MS = 4500;

export default function ParceiroCicloRoda({ etapas }) {
  const [ativo, setAtivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [velocidade, setVelocidade] = useState(1);
  const [arrastando, setArrastando] = useState(false);
  const [semMovimento, setSemMovimento] = useState(false);
  const arrasteRef = useRef(null);
  const total = etapas.length;

  // respeita quem pediu menos movimento no sistema: nada gira sozinho
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => setSemMovimento(mq.matches);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);

  // 📱 aba em segundo plano (celular no bolso): não gira à toa
  const [visivel, setVisivel] = useState(true);
  useEffect(() => {
    const ver = () => setVisivel(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', ver);
    window.addEventListener('focus', ver);
    return () => {
      document.removeEventListener('visibilitychange', ver);
      window.removeEventListener('focus', ver);
    };
  }, []);

  const girando = !pausado && !arrastando && visivel && !semMovimento;

  useEffect(() => {
    if (!girando) return;
    const id = setInterval(() => setAtivo((a) => (a + 1) % total), PASSO_MS / velocidade);
    return () => clearInterval(id);
  }, [girando, velocidade, total]);

  const irPara = useCallback((i) => setAtivo(((i % total) + total) % total), [total]);

  // ✋ arrasto: passar a mão gira a roda e vai abrindo as mensagens
  const onPointerDown = (e) => {
    setArrastando(true);
    arrasteRef.current = { x: e.clientX, base: ativo, movido: false };
  };
  const onPointerMove = (e) => {
    const d = arrasteRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) < 46) return;
    const passos = Math.round(dx / 46);
    irPara(d.base + passos);
    d.movido = true;
  };
  const onPointerUp = () => {
    arrasteRef.current = null;
    setArrastando(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); irPara(ativo + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); irPara(ativo - 1); }
  };

  const etapa = etapas[ativo];
  const passoAngulo = 360 / total;
  // gira o mostrador para trazer a etapa ativa ao ponteiro do topo
  const rotacao = -ativo * passoAngulo;

  return (
    <div className="mt-12">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* MOSTRADOR */}
        <div className="flex justify-center">
          <div
            role="group"
            tabIndex={0}
            aria-label="Roda do ciclo de doze meses. Use as setas para navegar entre as etapas."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            onKeyDown={onKeyDown}
            className="relative aspect-square w-full max-w-[300px] cursor-grab select-none outline-none sm:max-w-[360px]"
            style={{ touchAction: 'pan-y' }}
          >
            {/* ponteiro fixo no topo */}
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-0 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-t border-pc-ouro bg-pc-preto"
            />

            {/* aros do mostrador */}
            <div className="absolute inset-0 rounded-full border border-pc-borda" />
            <div className="absolute inset-[14%] rounded-full border border-pc-borda/60" />

            {/* anel giratório com as marcações dos 12 meses */}
            <div
              className="absolute inset-0 transition-transform duration-700 ease-out"
              style={{ transform: `rotate(${rotacao}deg)` }}
            >
              {/* traços dos 12 meses */}
              {Array.from({ length: 12 }).map((_, m) => (
                <div
                  key={`mes-${m}`}
                  aria-hidden="true"
                  className="absolute left-1/2 top-0 h-1/2 w-px origin-bottom"
                  style={{ transform: `rotate(${m * 30}deg)` }}
                >
                  <div className="mx-auto h-2 w-px bg-pc-borda" />
                </div>
              ))}

              {/* marcações das etapas — toque salta direto */}
              {etapas.map((e, i) => (
                <div
                  key={e.quando}
                  className="absolute left-1/2 top-0 h-1/2 w-0 origin-bottom"
                  style={{ transform: `rotate(${i * passoAngulo}deg)` }}
                >
                  <button
                    type="button"
                    aria-label={`Etapa ${e.quando}: ${e.titulo}`}
                    aria-current={i === ativo ? 'step' : undefined}
                    onClick={() => irPara(i)}
                    className="absolute left-1/2 top-0 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                    style={{ transform: `translate(-50%, -50%) rotate(${-i * passoAngulo - rotacao}deg)` }}
                  >
                    <span
                      className={`block rounded-full transition-all ${
                        i === ativo
                          ? 'h-3.5 w-3.5 bg-pc-ouro'
                          : 'h-2 w-2 bg-pc-borda'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* centro: só a etapa ativa */}
            <div className="absolute inset-[20%] flex flex-col items-center justify-center text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">{etapa.quando}</p>
              <p className="mt-2 text-sm font-bold leading-tight text-pc-tinta sm:text-base">
                {etapa.titulo}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-pc-tinta-fraca">
                {`${ativo + 1} de ${total}`}
              </p>
            </div>
          </div>
        </div>

        {/* MENSAGEM + CONTROLES */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">{etapa.quando}</p>
          <h3 className="mt-2 text-xl font-bold text-pc-tinta sm:text-2xl">{etapa.titulo}</h3>
          {/* altura reservada: a descrição mais longa nunca corta nem pula o layout */}
          <p className="mt-4 min-h-[5.5rem] text-sm leading-relaxed text-pc-tinta-fraca sm:min-h-[4.5rem] sm:text-base">
            {etapa.texto}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-pc-borda pt-5">
            {/* ◀ ▶ passo a passo: quem quer ler no próprio ritmo não precisa esperar o giro */}
            <button
              type="button"
              onClick={() => { setPausado(true); irPara(ativo - 1); }}
              aria-label="Etapa anterior"
              className="flex h-11 w-11 items-center justify-center border border-pc-borda text-pc-ouro transition-colors hover:border-pc-ouro"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => { setPausado(true); irPara(ativo + 1); }}
              aria-label="Próxima etapa"
              className="flex h-11 w-11 items-center justify-center border border-pc-borda text-pc-ouro transition-colors hover:border-pc-ouro"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setPausado((p) => !p)}
              aria-label={pausado ? 'Retomar o giro' : 'Pausar o giro'}
              className="flex min-h-[44px] items-center gap-2 border border-pc-borda px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:border-pc-ouro"
            >
              {pausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {pausado ? 'Retomar' : 'Pausar'}
            </button>
            <button
              type="button"
              onClick={() => setVelocidade((v) => (v === 1 ? 2 : 1))}
              aria-label={`Velocidade ${velocidade}x. Toque para alternar.`}
              className="flex min-h-[44px] items-center gap-2 border border-pc-borda px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:border-pc-ouro"
            >
              <Gauge className="h-4 w-4" />
              {`${velocidade}x`}
            </button>
            <p className="text-[10px] leading-relaxed text-pc-tinta-fraca">
              Passe o dedo na roda para girar e ler no seu ritmo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}