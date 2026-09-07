import React from 'react';
import FiguraDoHero from './FiguraDoHero';

// 🎓 DIR-62/67 — A FAIXA DA ACADEMIA no topo do painel.
//
// Ordem do dono (DIR-62): "aquele espaço em cima onde está branco, botar o
// professor bem temático ali, deixando tudo preto, pra ficar mais foda a
// academia, puxando a X-EOS juntamente com a Top College, e o professor em
// destaque".
//
// ONDE ELA APARECE (e por quê): só quando a pessoa está numa seção da TOP
// COLLEGE. A mesma faixa vale pra todas as abas do painel — se ela ficasse
// sempre, a faculdade voltaria a assinar a Carteira e os Pedidos, que é
// exatamente a fronteira que a DIR-57 fechou: Top College forma, Leilão NoZap
// opera. Aqui é a academia, então aqui ela manda.
//
// 🎓 DIR-67 — A FAIXA VIROU DUAS COLUNAS, por ordem do dono: "está tudo muito
// aqui no canto; 'qual é o seu poder' vamos deixar bem do lado do professor,
// tipo o que ele está falando; 'boa tarde, Luiz Santanna' pode colocar pra lá;
// esse meio vazio está legal".
//
//   ┌──────────────────────┬──────── vazio ────────┬───────────┬──────────┐
//   │ IDENTIDADE           │  (respiro do dono)    │  A FALA   │ PROFESSOR│
//   │ marcas · X-office    │                       │ saudação  │          │
//   │ seletor              │                       │ + pergunta│          │
//   └──────────────────────┴───────────────────────┴───────────┴──────────┘
//
// A fala e o professor são IRMÃOS numa flex row: é isso que garante que a
// pergunta encoste nele em qualquer largura de tela. Na versão anterior o
// professor era absolute e a distância até o texto mudava com a altura da
// faixa — dava pra "quase" acertar, nunca pra garantir.
// 🌫️ A MÁSCARA DA COSTURA (ordem do dono: "as ligações todas em degradês
// imperceptíveis, um banner entrando no outro"). Um banner só encosta no
// outro sem emenda se ELE TERMINAR na cor de base — por isso o enfeite
// (padrão de X, brilhos coloridos) se dissolve antes das bordas de baixo e
// dos lados. As duas seções então se encontram no mesmo preto, e a junção
// some. As máscaras se cruzam (intersect): vale a área comum das duas.
const MASCARA_COSTURA = [
  'linear-gradient(180deg, #000 0%, #000 68%, transparent 100%)',
  'linear-gradient(90deg, transparent 0%, #000 5%, #000 95%, transparent 100%)',
].join(', ');

export default function HeroTopCollege({ saudacao, nome, seletor, escopo }) {
  return (
    /* a faixa não é mais um cartão: sem borda, sem canto no celular e no
       mesmo preto da página — ela DERRETE no resto em vez de ser recortada */
    <div className="relative overflow-hidden w-full rounded-none mb-0" style={{ background: 'var(--xeos-preto)' }}>
      {/* o padrão tonal de X do brandbook, por trás de tudo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.20]"
        style={{
          backgroundImage: 'url(/marca/padrao-xeos.webp)',
          backgroundSize: '620px auto',
          backgroundPosition: 'left top',
          // 🌫️ COSTURA INVISÍVEL: o enfeite morre antes da borda, então a
          // faixa termina no preto puro — o mesmo preto de quem vem embaixo.
          WebkitMaskImage: MASCARA_COSTURA,
          maskImage: MASCARA_COSTURA,
          WebkitMaskComposite: 'source-in',
          maskComposite: 'intersect',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 90% at 4% 0%, rgba(59,111,246,0.22), transparent 60%), radial-gradient(60% 80% at 34% 100%, rgba(230,46,139,0.16), transparent 62%)',
          WebkitMaskImage: MASCARA_COSTURA,
          maskImage: MASCARA_COSTURA,
          WebkitMaskComposite: 'source-in',
          maskComposite: 'intersect',
        }}
      />

      {/* ────────── a ASSINATURA, em UMA LINHA e largura total ──────────
          Ordem do dono: "quero a letra na lateral da logo, não abaixo,
          estendendo, numa linha só". Antes esta linha morava DENTRO da
          coluna da esquerda, que tem teto de 24rem — por isso a frase
          quebrava em três. Tirando ela da coluna, a frase ganha a largura
          inteira da faixa e cabe em uma linha (duas no notebook). No
          celular o flex-wrap joga a frase pra linha de baixo sozinha. */}
      {/* 📱 06/09 — NO CELULAR a frase vai pra LATERAL das marcas (ordem do
          dono: "pode entrar na lateral, do lado da logo, em duas linhas").
          As duas marcas empilham numa coluna estreita à esquerda; a frase
          ocupa o resto, em duas sentenças, uma embaixo da outra. No desktop
          (`sm:contents` desfaz a coluna) a faixa é exatamente a de antes. */}
      <div className="relative flex flex-nowrap sm:flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-3 px-6 sm:px-9 pt-6 sm:pt-8">
        <div className="flex flex-col items-start gap-1.5 shrink-0 sm:contents">
          <img src="/marca/topcollege.webp" alt="Top College" className="h-8 sm:h-11 w-auto shrink-0" draggable="false" />
          <span aria-hidden="true" className="hidden sm:block h-11 w-px bg-white/20 shrink-0" />
          <img src="/marca/marca-xeos-lockup.webp" alt="X-eos" className="h-5 sm:h-7 w-auto shrink-0" draggable="false" />
        </div>
        <span aria-hidden="true" className="h-10 sm:h-7 w-px bg-white/15 shrink-0" />
        <p
          className="flex-1 min-w-0 sm:flex-1 sm:max-w-[42rem] text-[10px] sm:text-[11px] leading-snug text-white/40"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          <span className="block sm:inline">A primeira faculdade de empreendedorismo do planeta</span>
          <span className="hidden sm:inline"> · </span>
          <span className="block sm:inline">Estrutura de operação e expansão de qualquer negócio</span>
        </p>
      </div>

      <div className="relative flex flex-col sm:flex-row sm:items-end">
        {/* ────────── coluna 1: quem assina isto aqui ──────────
            2ª limpeza (07/09) — dono: "o lado esquerdo está com muita letra,
            dar mais uma espalhada". O bloco tinha três níveis (título,
            subtítulo, seletor) quase colados um no outro; agora cada um
            respira mais, e o "Só o meu / Tudo" SAIU daqui — foi morar do
            lado do nome, na coluna 2 (é lá que se diz "como quem" a pessoa
            está vendo a tela; misturado com a navegação de seções, ele
            brigava por atenção com o próprio menu). */}
        <div className="px-6 sm:px-9 pt-6 sm:pt-8 pb-6 sm:pb-9 w-full sm:w-auto sm:max-w-[25rem] shrink-0">
          {/* 🎓 DIR-66 — ordem do dono: DENTRO da Top College este título não é
              "Painel de Alavancagem" — é o X-office, a sub-marca que cuida de
              verificar o progresso e mapear processos. Fora da faculdade o nome
              de sempre continua (a troca vive só aqui, nesta faixa).
              É TEXTO e não o logo: a faixa já carrega duas marcas, e uma
              terceira ali seria a repetição que o dono acabou de mandar tirar. */}
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.08]">
            X-office
          </h1>
          <p className="mt-2 sm:mt-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-white/35" style={{ fontFamily: 'Sora, sans-serif' }}>
            Verificando o progresso e mapeando processos
          </p>

          {/* 🎓 DIR-64/67 — o seletor de SEÇÕES mora DENTRO da faixa: assim ele
              abre sobre o preto (era o pedido — abria branco por cima do
              painel e ficava feio) e some a faixa branca que sobrava entre a
              faixa e o painel. Sozinho agora — sem o "Só o meu/Tudo" grudado
              embaixo —, ganhou o respiro que faltava. */}
          {seletor && <div className="mt-8 sm:mt-10 max-w-xl">{seletor}</div>}
        </div>

        {/* ────────── coluna 2: o professor e a fala dele ──────────
            flex-1 + justify-end = todo o espaço que sobrar vira o meio vazio
            que o dono pediu pra manter; o par fala+professor fica colado na
            direita, sempre junto. */}
        <div className="relative flex w-full sm:w-auto sm:flex-1 min-w-0 items-end justify-end sm:self-stretch pr-6 sm:pr-9">
          <div className="flex flex-col items-end">
            {/* 👤/🛡️ 2ª limpeza (07/09) — o "Só o meu / Tudo" mudou pra cá:
                do lado de quem está vendo a tela, não misturado na navegação
                de seções. É ele quem responde "como quem eu vejo isto". Mora
                FORA do bloco da fala (que tem teto estreito, pensado pro
                texto) — a pílula precisa da própria largura pra não quebrar
                linha no meio de "Só o meu". */}
            {escopo && <div className="mb-2.5 sm:mb-3">{escopo}</div>}
            <div
              className="text-right pb-[85px] sm:pb-[198px] lg:pb-[220px] pr-3 sm:pr-5 max-w-[11rem] sm:max-w-[16rem]"
              style={{ textShadow: '0 2px 18px rgba(0,2,12,0.9)' }}
            >
              {/* a saudação virou FALA do professor: ele cumprimenta e, na linha
                  seguinte, faz a pergunta da marca. Era isso que ela ganhava
                  saindo do canto — deixou de ser rodapé de cabeçalho. */}
              {saudacao && (
                <p className="text-[10px] sm:text-xs text-white/50 mb-1 sm:mb-1.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {saudacao}{nome ? `, ${nome}` : ''}
                </p>
              )}
              <p
                className="text-base sm:text-3xl font-extrabold tracking-tight leading-[1.12] bg-clip-text text-transparent"
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

          {/* 🧑‍🏫 o professor. É decorativo — a fala ao lado é que carrega a
              mensagem —, por isso aria-hidden: leitor de tela não anuncia uma
              imagem sem conteúdo.
              A máscara na borda esquerda substituiu o véu preto que cobria a
              faixa inteira: antes o texto morava POR CIMA dele e precisava do
              escurecimento pra ser lido; agora o texto está do lado, então dá
              pra derreter só a borda e devolver o rosto em cheio — que é o
              "professor em destaque" da DIR-62.
              DIR-83 — a imagem antiga (/marca/poder-hero.webp) era o Patrick
              Stewart como Charles Xavier (Marvel): personagem licenciado e
              rosto de ator real numa tela pública de plataforma de terceiros.
              Trocado pelo Mentor do elenco próprio (ElencoBoneco/DIR-78) —
              mesma silhueta de professor (barba, óculos), sem depender de
              imagem de terceiro nenhuma. */}
          <div
            aria-hidden="true"
            className="relative pointer-events-none shrink-0 h-[177px] sm:h-[272px] lg:h-[300px] flex items-end justify-end select-none overflow-hidden"
          >
            {/* 🔦 o holofote atrás da figura: as mesmas cores azul/magenta da
                frase ao lado. É ele que dá o "professor em destaque" da
                DIR-62 sem depender do que a figura é — foto ou desenho.
                A máscara de borda mora DENTRO do FiguraDoHero, porque foto
                (retângulo com fundo) e desenho (recortado) pedem recortes
                diferentes. */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'radial-gradient(48% 64% at 64% 82%, rgba(59,111,246,0.38), transparent 68%), radial-gradient(40% 52% at 80% 58%, rgba(230,46,139,0.24), transparent 70%)' }}
            />
            {/* 07/09 (3ª limpeza) — dono: "a imagem ainda está muito pequena,
                pouco impactante… deixa ela maior, com mais conexão com a
                frase, tanto no desktop quanto no celular". Os três tamanhos
                cresceram 36% (eram 130/200/220) — em CLASSES responsivas de
                verdade, não mais via `transform: scale` (que só mudava a
                pintura e deixava a foto estourar a largura no celular). */}
            <div className="relative" style={{ filter: 'drop-shadow(0 16px 34px rgba(0,2,12,0.72))' }}>
              <FiguraDoHero classeAltura="h-[177px] sm:h-[272px] lg:h-[300px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
