import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { estiloBalao } from '@/lib/tourGuiado';

// 🖐️ A MÃOZINHA — tour guiado genérico, spotlight na tela DE VERDADE (não
// uma tela à parte explicando).
//
// Dono (08/09/2026), sobre a Esteira: "a plataforma tem que ensinar ela
// direto, não só o guia... entrar. Estou de a plataforma agora e a
// plataforma enviando ela, qual é o passo a passo da plataforma?" E depois,
// ampliando pro app inteiro: "a pessoa sempre entre no modo de estudo, tudo
// que ela tiver dúvida... a mãozinha vem ensinando ela pra ela não depender
// de ninguém... desde o sonho até a duplicação dos oito hábitos."
//
// Este componente é a peça REUTILIZÁVEL de "modo estudo": aponta pra um
// elemento real da tela (via o mesmo atributo `data-teste` que a banca de
// provas já usa — um lugar só pra achar UI, não dois), escurece o resto,
// e anda com "próximo/voltar" contando uma história curta. Cada tela que
// quiser sua "mãozinha" só precisa de uma lista de passos — a primeira é a
// Esteira de Captação (CrmEsteiraCaptacao.jsx); o app inteiro pode ganhar a
// dele com o mesmo componente.
//
// COMO USAR:
//   <TourGuiado ativo={aberto} passos={PASSOS} onFechar={() => setAberto(false)} />
//   PASSOS = [{ alvo: 'data-teste do elemento', titulo, texto }, ...]
// Um passo cujo alvo não existe na tela (ex.: fila vazia hoje) é pulado
// sozinho — a mãozinha nunca trava apontando pro nada.

const ESPERA_ALVO_MS = 600; // dá tempo do React desenhar antes de desistir do passo
const PAD = 8;

export default function TourGuiado({ ativo, passos = [], onFechar }) {
  const [indice, setIndice] = useState(0);
  const [retangulo, setRetangulo] = useState(null);
  // 🩹 09/09/2026 — dono, ao vivo, testando: "abriu tanto que não dava pra
  // ver o botão de continuar." Os textos dos passos cresceram (a pergunta
  // socrática antes da explicação), e o balão não tinha limite de altura —
  // num alvo perto do rodapé da tela, ele estourava pra baixo do viewport e
  // o botão "próximo" ficava fora, sem nada que rolasse até ele. `alturaMax`
  // é o mesmo número usado pra POSICIONAR (estiloBalao) e pra LIMITAR
  // (maxHeight do JSX) — os dois têm que concordar, senão volta o mesmo erro.
  const [alturaMax, setAlturaMax] = useState(420);
  useEffect(() => {
    const medirAltura = () => setAlturaMax(Math.min(420, window.innerHeight - 24));
    medirAltura();
    window.addEventListener('resize', medirAltura);
    return () => window.removeEventListener('resize', medirAltura);
  }, []);
  const esperaRef = useRef(null);

  useEffect(() => { if (ativo) setIndice(0); }, [ativo]);

  const medir = useCallback(() => {
    const passo = passos[indice];
    if (!passo) return null;
    const alvo = document.querySelector(`[data-teste="${passo.alvo}"]`);
    if (!alvo) return null;
    // 🎯 sem `smooth`: com animação, o retângulo medido no mesmo instante
    // fica desatualizado assim que o scroll começa a andar (a mãozinha
    // ficava mirando onde o alvo ESTAVA, não onde ele está) — instantâneo
    // garante que a medida e a posição real nunca desincronizam.
    alvo.scrollIntoView({ block: 'center' });
    const r = alvo.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }, [passos, indice]);

  // reposiciona ao trocar de passo, rolar ou redimensionar; se o alvo não
  // existe (ainda não montou, ou nem se aplica hoje), espera um instante e
  // PULA pro próximo passo sozinho — nunca fica preso apontando pro vazio.
  useEffect(() => {
    if (!ativo) return undefined;
    clearTimeout(esperaRef.current);
    const tentar = () => {
      const r = medir();
      setRetangulo(r);
      if (!r) {
        esperaRef.current = setTimeout(() => {
          if (medir()) { setRetangulo(medir()); return; }
          setIndice((i) => (i < passos.length - 1 ? i + 1 : -1)); // -1 fecha (último passo também sem alvo)
        }, ESPERA_ALVO_MS);
      }
    };
    tentar();
    const ao = () => setRetangulo(medir());
    window.addEventListener('resize', ao);
    window.addEventListener('scroll', ao, true);
    return () => { clearTimeout(esperaRef.current); window.removeEventListener('resize', ao); window.removeEventListener('scroll', ao, true); };
  }, [ativo, indice, medir, passos.length]);

  useEffect(() => { if (indice === -1) onFechar?.(false); }, [indice, onFechar]);

  if (!ativo || !passos.length || indice < 0) return null;
  const passo = passos[indice];
  const ultimo = indice === passos.length - 1;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={`Tour: ${passo.titulo}`}>
      {retangulo ? (
        <div
          data-teste="tour-spotlight"
          className="fixed rounded-lg ring-2 ring-nz-verde pointer-events-none transition-all duration-300"
          style={{
            top: retangulo.top - PAD, left: retangulo.left - PAD,
            width: retangulo.width + PAD * 2, height: retangulo.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(6,10,20,0.88)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[#060a14]/88 transition-opacity duration-300" />
      )}

      {/* 🩹 flex-col + maxHeight: o rodapé (bolinhas + botões) é `shrink-0`,
          então ele NUNCA fica de fora — quem rola, se o texto for grande
          demais pro espaço, é só o parágrafo do meio. */}
      <div
        className="fixed z-[101] w-[92vw] max-w-sm rounded-xl border border-nz-verde/40 bg-white shadow-2xl transition-all duration-300 flex flex-col overflow-hidden"
        style={{ ...estiloBalao(retangulo, alturaMax), maxHeight: alturaMax }}
      >
        <div className="flex items-start justify-between gap-2 p-4 pb-0 shrink-0">
          <p className="text-sm font-bold text-nz-tinta">🖐️ {passo.titulo}</p>
          <button type="button" onClick={() => onFechar?.(false)} aria-label="Fechar o tour" className="shrink-0 text-nz-tinta-fraca hover:text-nz-tinta">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1.5 px-4 text-xs text-nz-tinta-fraca leading-relaxed overflow-y-auto min-h-0">{passo.texto}</p>
        <div className="mt-3 flex items-center justify-between gap-2 p-4 pt-3 shrink-0 border-t border-nz-borda/40">
          <div className="flex items-center gap-1" aria-hidden="true">
            {passos.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === indice ? 'bg-nz-verde' : 'bg-nz-borda'}`} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {indice > 0 && (
              <button type="button" onClick={() => setIndice((i) => i - 1)} className="inline-flex items-center gap-1 rounded-full border border-nz-borda px-2.5 py-1 text-xs font-semibold text-nz-tinta-fraca hover:text-nz-tinta">
                <ArrowLeft className="w-3.5 h-3.5" /> voltar
              </button>
            )}
            <button
              type="button"
              onClick={() => (ultimo ? onFechar?.(true) : setIndice((i) => i + 1))}
              data-teste="tour-proximo"
              className="inline-flex items-center gap-1 rounded-full bg-nz-verde px-3 py-1.5 text-xs font-bold text-white hover:bg-nz-verde-claro"
            >
              {ultimo ? 'entendi!' : 'próximo'} {!ultimo && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
