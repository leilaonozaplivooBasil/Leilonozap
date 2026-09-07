import React from 'react';

// 🕴️ O EXECUTIVO DA FAIXA — desenhado à mão, em vetor (dono, 07/09/2026):
// "vamos criar uma imagem foda aqui mesmo… na pegada do site, apontando pra
// frente, combinando com a frase 'qual é o seu poder'… executivo foda, sério."
//
// POR QUE DESENHADO NO CÓDIGO, e não uma foto:
//   • a imagem que morava aqui era o Patrick Stewart como Charles Xavier —
//     rosto de ator real + personagem da Marvel numa plataforma que é
//     licenciada a terceiros. Saiu por isso (DIR-83);
//   • foto de banco de imagem resolveria a licença, mas esta máquina não tem
//     saída de rede pra baixar nenhuma (política de rede da conta);
//   • gerar por IA dependia do Magnific, que respondeu erro de plano.
// Desenhado aqui, ele é NOSSO: sem licença, sem terceiro, sem risco — e afina
// com a marca de um jeito que foto nenhuma afinaria.
//
// O QUE FAZ ELE LER COMO "EXECUTIVO FODA, SÉRIO":
//   • ombro largo e cintura estreita — a silhueta diz "poder" antes de
//     qualquer detalhe do rosto;
//   • terno escuro que ainda assim DESTACA do preto da faixa (nunca preto
//     puro: o vulto sumiria no fundo);
//   • luz de recorte azul de um lado e magenta do outro, borrada de leve —
//     as MESMAS cores do gradiente da frase "Qual é o seu poder?" ao lado.
//     Sem o borrão elas viram risco de caneta, não luz;
//   • cara séria: sobrancelha reta e baixa, boca reta, olho pequeno. Nada de
//     sorriso de mascote;
//   • o braço APONTA na direção da frase — é o gesto que transforma a
//     pergunta em convite ("e você?").
//
// O corpo inteiro mora num <g> deslocado 6px: é a folga que o dedo apontando
// precisa pra não encostar na borda do desenho.

export default function ExecutivoHero({ altura = 220, titulo = 'O Executivo' }) {
  const largura = Math.round(altura * (236 / 340));
  return (
    <svg
      width={largura}
      height={altura}
      viewBox="0 0 236 340"
      role="img"
      aria-label={titulo}
      className="select-none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="xhTerno" x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0%" stopColor="#39415A" />
          <stop offset="40%" stopColor="#232A3C" />
          <stop offset="100%" stopColor="#12151F" />
        </linearGradient>
        <linearGradient id="xhLapela" x1="0" y1="0" x2="1" y2="0.7">
          <stop offset="0%" stopColor="#454E69" />
          <stop offset="100%" stopColor="#1B2030" />
        </linearGradient>
        <linearGradient id="xhManga" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#3E465F" />
          <stop offset="100%" stopColor="#1A1F2D" />
        </linearGradient>
        <linearGradient id="xhCalca" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2A3145" />
          <stop offset="100%" stopColor="#0E1119" />
        </linearGradient>
        <linearGradient id="xhPele" x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#E3B287" />
          <stop offset="55%" stopColor="#C68C5C" />
          <stop offset="100%" stopColor="#8A5C3D" />
        </linearGradient>
        <linearGradient id="xhCamisa" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#F4F7FB" />
          <stop offset="100%" stopColor="#B6BFCF" />
        </linearGradient>
        {/* a gravata carrega as cores da marca, mas em tom fechado: acesa
            demais ela vira o assunto do desenho e rouba a cara dele */}
        <linearGradient id="xhGravata" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#2F58A8" />
          <stop offset="55%" stopColor="#5A3286" />
          <stop offset="100%" stopColor="#96285F" />
        </linearGradient>
        <linearGradient id="xhCabelo" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#7A828F" />
          <stop offset="35%" stopColor="#414857" />
          <stop offset="100%" stopColor="#282D38" />
        </linearGradient>
        {/* luz é borrão, não traço: sem este filtro o recorte vira caneta */}
        <filter id="xhLuz" x="-60%" y="-30%" width="220%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <g transform="translate(6,0)">
        {/* a sombra que planta o vulto no chão — sem ela, o executivo boia */}
        <ellipse cx="142" cy="333" rx="56" ry="8" fill="#000000" opacity="0.42" />

        {/* ─────────── pernas e sapatos ─────────── */}
        <path
          d="M100,206 L184,206 C186,206 187,208 187,211 L182,270 L178,328 C178,331 176,332 173,332 L156,332 C153,332 151,330 151,327 L145,258 L139,327 C139,330 137,332 134,332 L117,332 C114,332 112,331 112,328 L108,270 L97,211 C97,208 98,206 100,206 Z"
          fill="url(#xhCalca)"
        />
        <path d="M112,324 C110,332 116,336 128,336 L141,336 C145,336 146,334 145,330 L144,324 Z" fill="#0A0C12" />
        <path d="M152,324 C150,332 156,336 168,336 L181,336 C185,336 186,334 185,330 L184,324 Z" fill="#0A0C12" />

        {/* ─────────── o paletó ─────────── */}
        <path
          d="M142,93 C132,93 124,95 118,98 L98,103 C90,106 86,116 85,130 L86,204 C85,215 91,223 102,224 L182,224 C193,223 199,215 198,204 L199,130 C198,116 194,106 186,103 L166,98 C160,95 152,93 142,93 Z"
          fill="url(#xhTerno)"
        />

        {/* camisa larga o bastante pra APARECER, depois gravata, depois lapelas */}
        <path d="M142,92 L122,104 L130,180 L156,180 L163,104 Z" fill="url(#xhCamisa)" />
        <path d="M142,92 L131,101 L138,109 Z" fill="#C9D2DF" />
        <path d="M142,92 L153,101 L146,109 Z" fill="#C9D2DF" />
        <path d="M142,100 L136,107 L142,113 L148,107 Z" fill="url(#xhGravata)" />
        <path d="M142,113 L137,120 L139,178 L146,178 L148,120 Z" fill="url(#xhGravata)" />
        <path d="M141,92 L119,105 L126,180 L132,180 L136,124 Z" fill="url(#xhLapela)" />
        <path d="M143,92 L165,105 L158,180 L152,180 L148,124 Z" fill="url(#xhLapela)" />
        <circle cx="142" cy="188" r="3" fill="#0B0E16" />

        {/* a luz que bate no alto do ombro — sem ela o terno vira pano chapado */}
        <path d="M100,104 C112,99 126,96 142,96 C158,96 172,99 184,104 C170,101 156,100 142,100 C128,100 114,101 100,104 Z" fill="#FFFFFF" opacity="0.07" />

        {/* ─────────── o braço que fica ao lado do corpo ─────────── */}
        <path
          d="M188,104 C197,112 201,130 201,150 L203,198 C204,208 199,215 190,215 C181,215 176,209 177,200 L180,152 C180,130 182,114 188,104 Z"
          fill="url(#xhManga)"
        />
        <path d="M178,112 C175,142 175,176 177,199" stroke="#0A0D15" strokeWidth="3.5" opacity="0.55" fill="none" strokeLinecap="round" />
        <path d="M177,199 L203,199 L203,204 L177,204 Z" fill="url(#xhCamisa)" />
        <path
          d="M178,203 C176,214 180,224 189,225 C197,226 201,219 200,209 C199,204 181,201 178,203 Z"
          fill="url(#xhPele)"
        />
        <g stroke="#8A5C3D" strokeWidth="1.2" opacity="0.45" strokeLinecap="round">
          <path d="M180,212 L199,211" />
          <path d="M181,218 L199,217" />
        </g>

        {/* ─────────── o braço que APONTA, na direção da frase ───────────
            É a peça que faz o desenho conversar com "Qual é o seu poder?".
            Vai quase reto pro lado: dobrado demais, o gesto vira "coçando o
            braço"; reto demais, vira poste. */}
        <path
          d="M96,98 C74,104 48,117 26,132 L34,149 C56,138 84,130 102,124 C108,114 104,100 96,98 Z"
          fill="url(#xhManga)"
        />
        {/* o punho da camisa aparecendo — é o detalhe que diz "terno de verdade" */}
        <path d="M26,132 L34,149 L27,153 L19,136 Z" fill="url(#xhCamisa)" />
        {/* a mão: punho fechado e o indicador esticado apontando pra frente */}
        <path
          d="M23,137 C15,139 11,145 12,152 C14,159 21,162 27,158 C32,155 32,146 29,140 C27,137 25,136 23,137 Z"
          fill="url(#xhPele)"
        />
        <path d="M15,146 C6,142 0,143 0,147 C0,150 6,152 15,152 Z" fill="url(#xhPele)" />
        <path d="M15,153 C11,153 9,154 9,156 C10,158 13,158 16,157 Z" fill="#8A5C3D" opacity="0.45" />

        {/* ─────────── pescoço e cabeça ─────────── */}
        <path d="M131,70 L153,70 L156,98 L128,98 Z" fill="url(#xhPele)" />
        <path d="M131,70 L153,70 L154,79 C147,85 136,85 130,79 Z" fill="#7A5236" opacity="0.55" />
        <path
          d="M116,44 C116,25 127,15 142,15 C157,15 168,25 168,44 L168,57 C168,73 157,85 142,85 C127,85 116,73 116,57 Z"
          fill="url(#xhPele)"
        />
        <path d="M115,51 C111,51 110,56 112,60 C114,63 116,62 117,60 Z" fill="url(#xhPele)" />
        <path d="M169,51 C173,51 174,56 172,60 C170,63 168,62 167,60 Z" fill="url(#xhPele)" />
        {/* cabelo curto, com a têmpora grisalha: autoridade sem envelhecer */}
        <path
          d="M115,47 C114,25 126,14 142,14 C158,14 170,25 169,47 C166,35 158,28 147,26 C133,23 121,29 118,39 C116,42 115,45 115,47 Z"
          fill="url(#xhCabelo)"
        />
        {/* a cara séria: sobrancelha reta e baixa, olho pequeno, boca reta */}
        <path d="M125,46 L137,45" stroke="#2A2F3A" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M147,45 L159,46" stroke="#2A2F3A" strokeWidth="2.8" strokeLinecap="round" />
        <ellipse cx="131" cy="54" rx="3.4" ry="2.4" fill="#171B23" />
        <ellipse cx="153" cy="54" rx="3.4" ry="2.4" fill="#171B23" />
        <circle cx="132" cy="53.2" r="0.9" fill="#FFFFFF" opacity="0.9" />
        <circle cx="154" cy="53.2" r="0.9" fill="#FFFFFF" opacity="0.9" />
        <path d="M142,57 L139,67 L145,68" stroke="#9A6743" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        <path d="M134,76 L150,75" stroke="#6B432C" strokeWidth="2.6" strokeLinecap="round" />
        {/* a sombra que dá volume à maçã do rosto do lado escuro */}
        <path d="M160,50 C164,58 163,70 156,78 C162,72 166,62 164,52 Z" fill="#7A5236" opacity="0.35" />

        {/* ─────────── a luz de recorte: azul de um lado, magenta do outro ───────────
            É ela que amarra o desenho na frase ao lado (mesmo azul→magenta) e
            tira o vulto do fundo preto sem precisar clarear o terno. */}
        <g fill="none" strokeLinecap="round" filter="url(#xhLuz)">
          <path d="M117,38 C115,50 116,64 123,74" stroke="#3B6FF6" strokeWidth="3" opacity="0.42" />
          <path d="M96,101 C74,106 48,119 26,133" stroke="#3B6FF6" strokeWidth="3.4" opacity="0.62" />
          <path d="M87,130 C84,148 83,170 84,188 L82,206" stroke="#3B6FF6" strokeWidth="3.4" opacity="0.55" />
          <path d="M108,212 L105,268 L110,326" stroke="#3B6FF6" strokeWidth="2.6" opacity="0.3" />
          <path d="M167,34 C171,44 170,60 164,71" stroke="#E62E8B" strokeWidth="3" opacity="0.38" />
          <path d="M188,114 C198,124 202,142 202,159 L205,204" stroke="#E62E8B" strokeWidth="3.4" opacity="0.55" />
          <path d="M182,212 L182,270 L183,326" stroke="#E62E8B" strokeWidth="2.6" opacity="0.3" />
        </g>
      </g>
    </svg>
  );
}
