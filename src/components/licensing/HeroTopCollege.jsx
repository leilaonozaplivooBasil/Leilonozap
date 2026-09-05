import React from 'react';

// 🎓 DIR-62 — A FAIXA DA ACADEMIA no topo do painel.
//
// Ordem do dono: "aquele espaço em cima onde está branco, botar o professor
// bem temático ali, deixando tudo preto, pra ficar mais foda a academia,
// puxando a X-EOS juntamente com a Top College, e o professor em destaque".
//
// ONDE ELA APARECE (e por quê): só quando a pessoa está numa seção da TOP
// COLLEGE. A mesma faixa vale pra todas as abas do painel — se ela ficasse
// sempre, a faculdade voltaria a assinar a Carteira e os Pedidos, que é
// exatamente a fronteira que a DIR-57 fechou: Top College forma, Leilão NoZap
// opera. Aqui é a academia, então aqui ela manda.
export default function HeroTopCollege({ saudacao, nome }) {
  return (
    <div className="relative overflow-hidden rounded-3xl mb-6 sm:mb-8 border border-white/10" style={{ background: 'var(--xeos-preto)' }}>
      {/* o padrão tonal de X do brandbook, por trás de tudo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.20]"
        style={{ backgroundImage: 'url(/marca/padrao-xeos.webp)', backgroundSize: '620px auto', backgroundPosition: 'left top' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 90% at 4% 0%, rgba(59,111,246,0.22), transparent 60%), radial-gradient(60% 80% at 34% 100%, rgba(230,46,139,0.16), transparent 62%)',
        }}
      />

      {/* 🧑‍🏫 o professor: entra pela direita, grande, derretendo no preto.
          É decorativo — o texto ao lado é que carrega a mensagem —, por isso
          aria-hidden: leitor de tela não anuncia uma imagem sem conteúdo. */}
      <img
        src="/marca/poder-hero.webp"
        alt=""
        aria-hidden="true"
        draggable="false"
        className="pointer-events-none absolute right-0 bottom-0 h-full w-auto max-w-[62%] object-contain object-bottom opacity-70 sm:opacity-100"
      />
      {/* véu por cima da figura, do lado do texto, pra letra nunca disputar
          leitura com a foto em tela estreita */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(0,2,12,0.97) 30%, rgba(0,2,12,0.72) 58%, rgba(0,2,12,0.10) 100%)' }}
      />

      <div className="relative px-6 sm:px-9 py-7 sm:py-9 max-w-[70%] sm:max-w-[62%]">
        {/* as duas marcas juntas: a faculdade e o sistema, lado a lado */}
        <div className="flex items-center gap-4 sm:gap-5 mb-6">
          <img src="/marca/topcollege.webp" alt="Top College" className="h-9 sm:h-12 w-auto" draggable="false" />
          <span aria-hidden="true" className="h-8 sm:h-10 w-px bg-white/20" />
          <img src="/marca/marca-xeos-lockup.webp" alt="X-eos" className="h-6 sm:h-8 w-auto" draggable="false" />
        </div>

        {/* 🎓 DIR-63 — as frases das duas marcas moram AQUI agora. Elas eram o
            único conteúdo que o bloco de baixo tinha e a faixa não: com ele
            removido, a mensagem não se perde e o par de logos deixa de
            aparecer duas vezes na mesma tela. */}
        <p className="text-[11px] sm:text-xs leading-relaxed text-white/45 mb-5 max-w-md" style={{ fontFamily: 'Sora, sans-serif' }}>
          A primeira faculdade de empreendedorismo do planeta · Estrutura de operação
          e expansão de qualquer negócio
        </p>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.08]">
          Painel de Alavancagem
        </h1>
        {saudacao && (
          <p className="mt-1.5 text-sm sm:text-base text-white/60" style={{ fontFamily: 'Sora, sans-serif' }}>
            {saudacao}{nome ? `, ${nome}` : ''}
          </p>
        )}

        <p
          className="mt-5 sm:mt-6 text-lg sm:text-2xl font-extrabold tracking-tight bg-clip-text text-transparent"
          style={{
            fontFamily: 'Sora, sans-serif',
            // as três cores precisam CABER na largura da frase: com as paradas
            // padrão, o texto acabava ainda no azul e o magenta nunca aparecia
            backgroundImage: 'linear-gradient(100deg, var(--topcollege-azul) 0%, var(--topcollege-roxo) 34%, var(--topcollege-magenta) 72%)',
          }}
        >
          Qual é o seu poder?
        </p>
      </div>
    </div>
  );
}
