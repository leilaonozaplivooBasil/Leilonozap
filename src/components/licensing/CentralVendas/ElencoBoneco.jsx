import React from 'react';
import './elenco.css';
import { coresDo } from '@/lib/elencoJornada';

// 👔 O DESENHO DO ELENCO — DIR-78
//
// Um construtor só, parametrizado. É isso que faz os cinco parecerem família:
// mesmo corpo, mesma silhueta, mesmo selo X na lapela — muda pele, cabelo e
// terno. Se cada um fosse desenhado à parte, viravam cinco desconhecidos.
//
// A estrutura de grupos NÃO é decorativa — é o que permite o movimento:
//   tronco  → gira o corpo inteiro, a partir dos pés
//     corpo → respira e pula
//       cabeça → gira DEPOIS do corpo (o atraso é o que parece gente)
//         olhos → deslizam (o olhar) e, dentro deles, piscam
// Duas animações no transform do mesmo elemento não somam: a segunda apaga a
// primeira. Por isso são quatro camadas, e não uma.

const ROTACAO = {
  parado: { e: 0, d: 0 },
  aponta: { e: 0, d: -98 },
  acena: { e: 0, d: -142 },
  // braço esquerdo POSITIVO e direito NEGATIVO = os dois abrem pra FORA.
  // Com os sinais trocados eles cruzam o peito e somem atrás do paletó.
  alto: { e: 148, d: -148 },
  dorme: { e: 0, d: 0 },
};

/**
 * @param {string} chave  quem é (executivo, mentor, diretora, cliente, duplicado)
 * @param {string} pose   parado | acena | aponta | alto | dorme
 * @param {number} tam    altura em px — abaixo de 64 o desenho não lê
 * @param {number} defasagem  0..3, pra ninguém respirar no mesmo instante
 */
export default function ElencoBoneco({
  chave = 'executivo', pose = 'parado', tam = 96,
  apagado = false, defasagem = 0, festa = false, titulo = '',
}) {
  const c = coresDo(chave, apagado);
  const dorme = pose === 'dorme';
  const R = ROTACAO[pose] || ROTACAO.parado;

  const classes = [
    'xeos-boneco',
    dorme ? 'dormindo' : 'viva',
    pose === 'acena' ? 'acena' : '',
    festa ? 'festa' : '',
    ['', 'xd1', 'xd2', 'xd3'][defasagem % 4],
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} data-teste="boneco-elenco" data-boneco={chave} data-pose={pose}>
      <svg viewBox="0 0 132 190" width={Math.round(tam * 0.695)} height={tam} role="img" aria-label={titulo || c.nome}>
        {festa && (
          <g className="faiscas" stroke={c.ternoEsc} strokeWidth="3.6" strokeLinecap="round">
            <path d="M20 40 l-10 -10M112 40 l10 -10M14 68 l-12 -4M118 68 l12 -4M66 12 v-11" />
          </g>
        )}
        {/* a sombra no chão é o que planta o boneco no mapa — sem ela, flutua.
            No palco escuro ela inverte (o elenco.css cuida): sombra preta em
            fundo preto não existe, e o boneco voltaria a boiar. */}
        <ellipse className="sombra" cx="66" cy="180" rx="30" ry="6.5" fill="#0D1310" opacity=".13" />
        <g className="tronco"><g className="corpo">
          <rect x="50" y="128" width="13" height="42" rx="6.5" fill={c.ternoEsc} />
          <rect x="69" y="128" width="13" height="42" rx="6.5" fill={c.ternoEsc} />
          <ellipse cx="54" cy="172" rx="12" ry="6" fill="#1E2430" />
          <ellipse cx="78" cy="172" rx="12" ry="6" fill="#1E2430" />
          <g transform={`rotate(${R.e} 40 100)`}><g className="bracoE">
            <rect x="33" y="92" width="13.5" height="44" rx="6.75" fill={c.terno} />
            <circle cx="39.7" cy="139" r="7.4" fill={c.pele} />
          </g></g>
          <g transform={`rotate(${R.d} 92 100)`}><g className="bracoD">
            <rect x="85.5" y="92" width="13.5" height="44" rx="6.75" fill={c.terno} />
            <circle cx="92.2" cy="139" r="7.4" fill={c.pele} />
          </g></g>
          <path d="M66 84c-16 0-27 5-30 13-3 8-4 21-4 36h68c0-15-1-28-4-36-3-8-14-13-30-13z" fill={c.terno} />
          <path d="M66 84l-13 6 8 43h10l8-43z" fill={c.camisa} />
          <path d="M66 96l-5.5 5 3 34h5l3-34z" fill={c.gravata} />
          <path d="M66 84l-13 6 5 26 8-24zM66 84l13 6-5 26-8-24z" fill={c.ternoEsc} />
          {/* o selo X na lapela: o detalhe que é da casa */}
          <circle cx="47" cy="103" r="6.4" fill="#F5C451" />
          <path d="M44.2 100.2l5.6 5.6M49.8 100.2l-5.6 5.6" stroke="#0C1F16" strokeWidth="2.1" strokeLinecap="round" />
          <rect x="59" y="74" width="14" height="14" rx="5" fill={c.pele} />
          <g className="cabeca">
            <circle cx="66" cy="52" r="29" fill={c.pele} />
            {c.cabeloLongo
              ? <path d="M37 52a29 29 0 0 1 58 0v26q-7-12-8-28-21 9-42 0-1 16-8 28z" fill={c.cabelo} />
              : <path d="M37 50a29 29 0 0 1 58 0q-11-11-29-11-18 0-29 11z" fill={c.cabelo} />}
            {c.barba && <path d="M42 58q3 26 24 26 21 0 24-26-4 16-24 16-20 0-24-16z" fill={c.cabelo} opacity=".92" />}
            {c.oculos && (
              <g stroke="#0D1310" strokeWidth="2.6" fill="none">
                <rect x="43" y="45" width="18" height="14" rx="6" />
                <rect x="71" y="45" width="18" height="14" rx="6" />
                <path d="M61 52h10" />
              </g>
            )}
            {dorme
              ? <path d="M46 52 q6 4 12 0M74 52 q6 4 12 0" stroke="#0D1310" strokeWidth="3" fill="none" strokeLinecap="round" />
              : (
                <g className="olhos"><g className="olhosIn">
                  <circle cx="52" cy="52" r="4.6" fill="#0D1310" />
                  <circle cx="80" cy="52" r="4.6" fill="#0D1310" />
                  <circle cx="53.6" cy="50.4" r="1.5" fill="#fff" />
                  <circle cx="81.6" cy="50.4" r="1.5" fill="#fff" />
                </g></g>
              )}
            {dorme && <ellipse cx="66" cy="66" rx="4.5" ry="3.2" fill="#7A2E2E" />}
            {pose === 'alto' && (
              <g>
                <ellipse cx="66" cy="66" rx="8" ry="7" fill="#7A2E2E" />
                <path d="M58.6 63.5h14.8a7.4 7.4 0 0 1-14.8 0z" fill="#fff" />
              </g>
            )}
            {!dorme && pose !== 'alto' && (
              <>
                <g className="bocaF">
                  <path d="M57 64 q9 8 18 0" stroke="#0D1310" strokeWidth="3.2" fill="none" strokeLinecap="round" />
                </g>
                <g className="bocaA">
                  <ellipse cx="66" cy="67" rx="7.4" ry="6.4" fill="#7A2E2E" />
                  <path d="M59.2 64.6h13.6a6.8 6.8 0 0 1-13.6 0z" fill="#fff" />
                </g>
              </>
            )}
          </g>
        </g></g>
        {dorme && (
          <g fontWeight="800" fill="#94A3B8">
            <text className="zzz" x="97" y="36" fontSize="17">z</text>
            <text className="zzz b" x="106" y="26" fontSize="12">z</text>
          </g>
        )}
      </svg>
    </span>
  );
}
