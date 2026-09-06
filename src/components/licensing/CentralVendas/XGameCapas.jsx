import React from 'react';

// 🖼️ AS CAPAS DO MOMENTO — a cena de fundo de cada tarefa (ordem do dono:
// "treino, duas pessoas treinando numa academia; de manhã, o mar com o sol
// nascendo").
//
// POR QUE DESENHADAS EM SVG E NÃO FOTO DE BANCO:
//   • carregam sempre — nada de 404 ou host de terceiro caindo na cara do
//     cliente, e nada de rede no meio do caminho;
//   • pesam alguns KB e escalam em qualquer tela sem borrar;
//   • falam a mesma língua de cor do jogo.
// A foto real continua podendo entrar por tarefa (capa_url) e substitui a
// cena quando o dono subir a dele.
//
// Todas usam o mesmo palco: 1600×900, "slice" (preenche cortando), pensadas
// pra viver a ~35% de opacidade atrás do texto — silhueta forte, pouco
// detalhe, contraste alto.

const svgProps = {
  viewBox: '0 0 1600 900',
  preserveAspectRatio: 'xMidYMid slice',
  className: 'w-full h-full',
  'aria-hidden': 'true',
};

/** o mar com o sol nascendo — o amanhecer, a gratidão, o começo */
function CenaAmanhecer() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="xgCeuAm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="38%" stopColor="#6d28d9" />
          <stop offset="66%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fcd34d" />
        </linearGradient>
        <radialGradient id="xgSol">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#xgCeuAm)" />
      <circle cx="800" cy="548" r="230" fill="url(#xgSol)" />
      <circle cx="800" cy="548" r="86" fill="#fef3c7" opacity=".92" />
      {/* o mar */}
      <rect y="548" width="1600" height="352" fill="#082f49" opacity=".78" />
      {/* o caminho de luz na água */}
      <ellipse cx="800" cy="600" rx="110" ry="13" fill="#fde68a" opacity=".55" />
      <ellipse cx="800" cy="656" rx="170" ry="11" fill="#fbbf24" opacity=".38" />
      <ellipse cx="800" cy="722" rx="240" ry="10" fill="#fbbf24" opacity=".26" />
      <ellipse cx="800" cy="800" rx="320" ry="9" fill="#fbbf24" opacity=".16" />
      {/* as ondas da frente */}
      <path d="M0 636 q200 -22 400 0 t400 0 t400 0 t400 0 v290 H0z" fill="#0c4a6e" opacity=".5" />
      <path d="M0 726 q160 -20 320 0 t320 0 t320 0 t320 0 t320 0 v200 H0z" fill="#082f49" opacity=".65" />
    </svg>
  );
}

/** duas pessoas treinando — a academia */
function CenaTreino() {
  const Atleta = ({ x, escala = 1, viraLado = 1 }) => (
    <g transform={`translate(${x} 0) scale(${viraLado * escala} ${escala})`}>
      {/* cabeça */}
      <circle cx="0" cy="470" r="34" />
      {/* tronco */}
      <path d="M-38 512 h76 l-10 138 h-56 z" />
      {/* braços erguendo o peso */}
      <path d="M-38 522 l-52 -46 14 -18 56 44 z" />
      <path d="M38 522 l52 -46 -14 -18 -56 44 z" />
      {/* pernas */}
      <path d="M-30 650 l-14 128 h30 l12 -96 12 96 h30 l-14 -128 z" />
    </g>
  );
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="xgGym" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="55%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#xgGym)" />
      {/* a luz alta da academia */}
      <ellipse cx="800" cy="180" rx="620" ry="190" fill="#fbbf24" opacity=".16" />
      {/* o chão */}
      <rect y="778" width="1600" height="122" fill="#450a0a" opacity=".85" />
      <g fill="#1c0a0a" opacity=".92">
        <Atleta x={560} escala={1} />
        {/* a barra que ele levanta */}
        <g transform="translate(560 0)">
          <rect x="-150" y="404" width="300" height="14" rx="7" />
          <rect x="-176" y="382" width="30" height="58" rx="8" />
          <rect x="146" y="382" width="30" height="58" rx="8" />
        </g>
        <Atleta x={1060} escala={0.88} viraLado={-1} />
        <g transform="translate(1060 0) scale(0.88)">
          <rect x="-128" y="418" width="256" height="13" rx="6" />
          <rect x="-152" y="398" width="27" height="53" rx="7" />
          <rect x="125" y="398" width="27" height="53" rx="7" />
        </g>
      </g>
      {/* o rack ao fundo */}
      <g fill="#1c0a0a" opacity=".45">
        <rect x="180" y="430" width="22" height="350" />
        <rect x="330" y="430" width="22" height="350" />
        <rect x="180" y="430" width="172" height="18" />
        <rect x="1320" y="470" width="20" height="310" />
        <rect x="1450" y="470" width="20" height="310" />
        <rect x="1320" y="470" width="150" height="16" />
      </g>
    </svg>
  );
}

/** a estrada e o corredor — a corrida */
function CenaCorrida() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="xgCeuCor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c4a6e" />
          <stop offset="60%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#xgCeuCor)" />
      <circle cx="1150" cy="480" r="120" fill="#fde68a" opacity=".5" />
      {/* as montanhas */}
      <path d="M0 560 L280 350 L520 560 Z" fill="#0f172a" opacity=".55" />
      <path d="M380 580 L720 300 L1060 580 Z" fill="#0f172a" opacity=".7" />
      <path d="M900 580 L1240 380 L1600 580 Z" fill="#0f172a" opacity=".6" />
      {/* a estrada */}
      <path d="M600 900 L740 580 H860 L1000 900 Z" fill="#1c1917" opacity=".9" />
      <g fill="#fde68a" opacity=".55">
        <rect x="792" y="600" width="14" height="34" />
        <rect x="789" y="672" width="18" height="42" />
        <rect x="784" y="758" width="24" height="52" />
      </g>
      {/* o corredor */}
      <g fill="#0c0a09" opacity=".95" transform="translate(690 0)">
        <circle cx="0" cy="500" r="26" />
        <path d="M-24 534 h48 l-12 106 h-30 z" />
        <path d="M-24 548 l-56 34 10 20 58 -30 z" />
        <path d="M24 548 l52 -38 12 18 -50 42 z" />
        <path d="M-22 640 l-40 106 26 12 34 -84 z" />
        <path d="M14 640 l44 96 -24 14 -40 -78 z" />
      </g>
    </svg>
  );
}

/** o livro aberto sob a luz — leitura e estudo */
function CenaLeitura() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="xgEstudo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c1e3e" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <radialGradient id="xgLuz">
          <stop offset="0%" stopColor="#fde68a" stopOpacity=".8" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#xgEstudo)" />
      <ellipse cx="800" cy="470" rx="560" ry="360" fill="url(#xgLuz)" />
      {/* o livro */}
      <g transform="translate(800 560)">
        <path d="M0 40 C-90 -30 -300 -50 -420 -20 L-420 190 C-300 160 -90 176 0 240 Z" fill="#e2e8f0" opacity=".92" />
        <path d="M0 40 C90 -30 300 -50 420 -20 L420 190 C300 160 90 176 0 240 Z" fill="#f8fafc" opacity=".95" />
        <path d="M-6 40 h12 v200 h-12 z" fill="#94a3b8" opacity=".8" />
        <g stroke="#64748b" strokeWidth="7" opacity=".38" strokeLinecap="round">
          <path d="M-360 40 h250" /><path d="M-360 82 h280" /><path d="M-360 124 h240" />
          <path d="M110 40 h250" /><path d="M90 82 h280" /><path d="M110 124 h240" />
        </g>
      </g>
    </svg>
  );
}

/** a vitrine acesa — a loja e a venda */
function CenaLoja() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="xgLoja" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#022c22" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#xgLoja)" />
      {/* a fachada */}
      <rect x="300" y="300" width="1000" height="600" fill="#064e3b" opacity=".85" />
      {/* o toldo listrado */}
      <g>
        <path d="M270 300 h1060 l-70 130 H340 Z" fill="#0f766e" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <path key={i} d={`M${300 + i * 128} 300 h64 l-45 130 h-64 Z`} fill="#f8fafc" opacity=".2" />
        ))}
      </g>
      {/* as vitrines acesas */}
      <rect x="380" y="480" width="330" height="250" rx="10" fill="#fde68a" opacity=".55" />
      <rect x="890" y="480" width="330" height="250" rx="10" fill="#fde68a" opacity=".45" />
      {/* a porta */}
      <rect x="740" y="530" width="120" height="370" rx="8" fill="#022c22" opacity=".9" />
      <circle cx="836" cy="720" r="9" fill="#fcd34d" opacity=".8" />
      {/* a calçada */}
      <rect y="860" width="1600" height="40" fill="#022c22" />
    </svg>
  );
}

/** as pessoas na mesa — reunião, equipe, apresentação */
function CenaReuniao() {
  const Pessoa = ({ x, r = 42, alt = 150 }) => (
    <g transform={`translate(${x} 0)`}>
      <circle cx="0" cy={700 - alt} r={r} />
      <path d={`M${-r * 1.5} 700 q${r * 1.5} ${-alt * 0.72} ${r * 3} 0 z`} />
    </g>
  );
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="xgReuniao" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#xgReuniao)" />
      <ellipse cx="800" cy="240" rx="520" ry="200" fill="#a78bfa" opacity=".16" />
      <g fill="#0f0a24" opacity=".9">
        <Pessoa x={420} r={40} alt={140} />
        <Pessoa x={640} r={46} alt={168} />
        <Pessoa x={980} r={46} alt={168} />
        <Pessoa x={1200} r={40} alt={140} />
      </g>
      {/* a mesa */}
      <ellipse cx="800" cy="740" rx="440" ry="86" fill="#0f0a24" opacity=".95" />
      <ellipse cx="800" cy="726" rx="440" ry="86" fill="#312e81" opacity=".9" />
      {/* o que está sobre a mesa */}
      <rect x="700" y="686" width="200" height="14" rx="7" fill="#c4b5fd" opacity=".5" />
      <rect x="560" y="706" width="90" height="10" rx="5" fill="#c4b5fd" opacity=".32" />
      <rect x="960" y="706" width="90" height="10" rx="5" fill="#c4b5fd" opacity=".32" />
    </svg>
  );
}

/** o celular e o brilho — conteúdo, story, post */
function CenaConteudo() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="xgConteudo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4c1d95" />
          <stop offset="50%" stopColor="#be185d" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#xgConteudo)" />
      <ellipse cx="800" cy="450" rx="420" ry="380" fill="#fff" opacity=".1" />
      {/* o celular */}
      <g transform="translate(800 450)">
        <rect x="-135" y="-250" width="270" height="500" rx="42" fill="#0f0a1e" opacity=".92" />
        <rect x="-115" y="-222" width="230" height="444" rx="26" fill="#fff" opacity=".14" />
        <circle cx="0" cy="-238" r="7" fill="#fff" opacity=".35" />
        {/* o coração da postagem */}
        <path d="M0 60 C-70 -10 -110 -60 -70 -104 C-40 -136 0 -114 0 -74 C0 -114 40 -136 70 -104 C110 -60 70 -10 0 60 Z" fill="#fff" opacity=".7" />
      </g>
      {/* as faíscas */}
      <g fill="#fff" opacity=".5">
        <path d="M400 300 l14 -42 14 42 42 14 -42 14 -14 42 -14 -42 -42 -14 z" />
        <path d="M1200 560 l11 -33 11 33 33 11 -33 11 -11 33 -11 -33 -33 -11 z" />
        <circle cx="1180" cy="260" r="12" />
        <circle cx="430" cy="640" r="9" />
      </g>
    </svg>
  );
}

/** a lua sobre as colinas — noite, descanso, fechamento do dia */
function CenaNoite() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="xgNoite" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020617" />
          <stop offset="60%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#xgNoite)" />
      <circle cx="1180" cy="240" r="92" fill="#e0e7ff" opacity=".85" />
      <circle cx="1146" cy="220" r="86" fill="#1e1b4b" opacity=".95" />
      <g fill="#e0e7ff">
        {[[240, 180, 4], [420, 120, 3], [600, 250, 5], [300, 380, 3], [900, 150, 4],
          [1420, 420, 4], [1500, 180, 3], [760, 400, 3], [130, 260, 4], [1050, 330, 3]].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} opacity={0.35 + (i % 4) * 0.14} />
        ))}
      </g>
      <path d="M0 660 q260 -130 520 -30 t540 -20 t540 60 v230 H0z" fill="#0b1030" opacity=".9" />
      <path d="M0 740 q300 -90 620 10 t980 -30 v180 H0z" fill="#060a20" />
    </svg>
  );
}

/** o horizonte — a cena padrão de quem ainda não tem a sua */
function CenaPadrao() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="xgPadrao" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="70%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#xgPadrao)" />
      <circle cx="800" cy="620" r="170" fill="#bae6fd" opacity=".28" />
      <path d="M0 620 L340 380 L640 620 Z" fill="#0f172a" opacity=".7" />
      <path d="M520 640 L940 320 L1360 640 Z" fill="#0f172a" opacity=".85" />
      <path d="M1120 640 L1400 460 L1600 640 Z" fill="#0f172a" opacity=".6" />
      <rect y="620" width="1600" height="280" fill="#082f49" opacity=".8" />
    </svg>
  );
}

// a cena de cada família de tarefa — casa com o mesmo vocabulário dos selos
const CENAS = [
  [/gratidao|foco no sonho|visualiza|acordar|bom dia|amanhecer|despertar/i, CenaAmanhecer],
  [/corrida|caminhada/i, CenaCorrida],
  [/treino|atividade fisica|academia|alongamento/i, CenaTreino],
  [/leitura|estudo|curso|licao|aprendiz|audio|podcast/i, CenaLeitura],
  [/story|post|instagram|conteudo|reels|video/i, CenaConteudo],
  [/venda|loja|catalogo|produto|compra|pedido|vitrine/i, CenaLoja],
  [/reuniao|apresenta|encontro|cliente|equipe|time|lideranca|treinament|sala|mentoria/i, CenaReuniao],
  [/descanso|dormir|sono|noite|pausa|fechamento/i, CenaNoite],
];

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** A capa do momento: a foto do gestor quando existir, senão a cena da
 *  família. Vem sempre mascarada num radial — nunca vira retângulo. */
export default function XGameCapa({ titulo, capaUrl }) {
  const [quebrou, setQuebrou] = React.useState(false);
  const mascara = 'radial-gradient(80% 66% at 50% 34%, #000 24%, rgba(0,0,0,0.5) 56%, transparent 82%)';

  if (capaUrl && !quebrou) {
    return (
      <img
        src={capaUrl}
        alt=""
        aria-hidden="true"
        onError={() => setQuebrou(true)}
        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-40"
        style={{ WebkitMaskImage: mascara, maskImage: mascara }}
      />
    );
  }

  const t = semAcento(titulo);
  const achada = CENAS.find(([re]) => re.test(t));
  const Cena = achada ? achada[1] : CenaPadrao;
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.34]"
      style={{ WebkitMaskImage: mascara, maskImage: mascara }}
    >
      <Cena />
    </div>
  );
}
