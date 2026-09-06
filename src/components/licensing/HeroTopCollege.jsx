import React from 'react';

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
export default function HeroTopCollege({ saudacao, nome, seletor }) {
  return (
    /* a faixa não é mais um cartão: sem borda, sem canto no celular e no
       mesmo preto da página — ela DERRETE no resto em vez de ser recortada */
    <div className="relative overflow-hidden -mx-4 sm:mx-0 rounded-none sm:rounded-3xl mb-4 sm:mb-5" style={{ background: 'var(--xeos-preto)' }}>
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

      <div className="relative flex flex-col sm:flex-row sm:items-end">
        {/* ────────── coluna 1: quem assina isto aqui ────────── */}
        <div className="px-6 sm:px-9 pt-7 sm:pt-9 pb-6 sm:pb-9 w-full sm:w-auto sm:max-w-[24rem] shrink-0">
          {/* as duas marcas juntas: a faculdade e o sistema, lado a lado */}
          <div className="flex items-center gap-4 sm:gap-5 mb-5">
            <img src="/marca/topcollege.webp" alt="Top College" className="h-9 sm:h-12 w-auto" draggable="false" />
            <span aria-hidden="true" className="h-8 sm:h-10 w-px bg-white/20" />
            <img src="/marca/marca-xeos-lockup.webp" alt="X-eos" className="h-6 sm:h-8 w-auto" draggable="false" />
          </div>

          {/* 🎓 DIR-63 — as frases das duas marcas moram AQUI agora. Elas eram o
              único conteúdo que o bloco de baixo tinha e a faixa não: com ele
              removido, a mensagem não se perde e o par de logos deixa de
              aparecer duas vezes na mesma tela. */}
          <p className="text-[11px] sm:text-xs leading-relaxed text-white/45 mb-5" style={{ fontFamily: 'Sora, sans-serif' }}>
            A primeira faculdade de empreendedorismo do planeta · Estrutura de operação
            e expansão de qualquer negócio
          </p>

          {/* 🎓 DIR-66 — ordem do dono: DENTRO da Top College este título não é
              "Painel de Alavancagem" — é o X-office, a sub-marca que cuida de
              verificar o progresso e mapear processos. Fora da faculdade o nome
              de sempre continua (a troca vive só aqui, nesta faixa).
              É TEXTO e não o logo: a faixa já carrega duas marcas, e uma
              terceira ali seria a repetição que o dono acabou de mandar tirar. */}
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.08]">
            X-office
          </h1>
          <p className="mt-1 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-white/35" style={{ fontFamily: 'Sora, sans-serif' }}>
            Verificando o progresso e mapeando processos
          </p>

          {/* 🎓 DIR-64/67 — o seletor mora DENTRO da faixa: assim ele abre sobre
              o preto (era o pedido — abria branco por cima do painel e ficava
              feio) e some a faixa branca que sobrava entre a faixa e o painel.
              Ele FICA nesta coluna de propósito: agora é a única coisa clicável
              da faixa, e comando de navegação mora do lado de quem assina a
              tela, não em cima da figura. */}
          {seletor && <div className="mt-6 sm:mt-7 max-w-xs">{seletor}</div>}
        </div>

        {/* ────────── coluna 2: o professor e a fala dele ──────────
            flex-1 + justify-end = todo o espaço que sobrar vira o meio vazio
            que o dono pediu pra manter; o par fala+professor fica colado na
            direita, sempre junto. */}
        <div className="relative flex w-full sm:w-auto sm:flex-1 min-w-0 items-end justify-end sm:self-stretch">
          <div
            className="text-right pb-[62px] sm:pb-[145px] lg:pb-[160px] pr-3 sm:pr-4 max-w-[10rem] sm:max-w-[15rem]"
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

          {/* 🧑‍🏫 o professor. É decorativo — a fala ao lado é que carrega a
              mensagem —, por isso aria-hidden: leitor de tela não anuncia uma
              imagem sem conteúdo.
              A máscara na borda esquerda substituiu o véu preto que cobria a
              faixa inteira: antes o texto morava POR CIMA dele e precisava do
              escurecimento pra ser lido; agora o texto está do lado, então dá
              pra derreter só a borda e devolver o rosto em cheio — que é o
              "professor em destaque" da DIR-62. */}
          <img
            src="/marca/poder-hero.webp"
            alt=""
            aria-hidden="true"
            draggable="false"
            className="pointer-events-none shrink-0 h-[170px] sm:h-[290px] lg:h-[320px] w-auto object-contain select-none"
            style={{
              // derrete nos QUATRO lados: entra pela esquerda, sai pela direita
              // e pelo pé, então o professor se funde na página em vez de
              // terminar numa aresta reta (ordem do dono: "sumindo na lateral")
              WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.45) 14%, #000 44%, #000 84%, transparent 100%), linear-gradient(0deg, transparent 0%, #000 16%)',
              maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.45) 14%, #000 44%, #000 84%, transparent 100%), linear-gradient(0deg, transparent 0%, #000 16%)',
              WebkitMaskComposite: 'source-in',
              maskComposite: 'intersect',
            }}
          />
        </div>
      </div>
    </div>
  );
}
