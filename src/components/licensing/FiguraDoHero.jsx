import React, { useState } from 'react';

// 🖼️ QUEM APARECE NA FAIXA — a foto do dono, com o desenho de reserva.
//
// Dono (07/09/2026): "eu gerei essa imagem, é totalmente aleatória, eu gerei,
// pode colocar essa imagem." É o caso limpo: imagem criada por ele, sem rosto
// de pessoa real reconhecível e sem personagem de terceiro — o X do fundo é a
// marca dele mesmo (X-eos). Nada a ver com a foto que saiu na DIR-83, que era
// o Patrick Stewart como Charles Xavier.
//
// POR QUE ESTE ARQUIVO EXISTE (e não um <img> direto):
// a imagem chegou pela conversa, não como arquivo no repositório — quem sobe
// o arquivo é o dono, pelo GitHub. Então a tela TENTA a foto e, enquanto ela
// não estiver lá, mostra o desenho vetorial. No dia em que o arquivo subir, a
// foto aparece sozinha, sem precisar mexer em código nenhum. E se um dia o
// arquivo sumir, a faixa não fica com o ícone de imagem quebrada: volta pro
// desenho.
//
// Os três nomes aceitos cobrem como a pessoa salvou o arquivo (png, jpg ou
// webp) — tenta um, falhou, tenta o próximo, e só então desenha.
const CAMINHOS = [
  '/marca/executivo-hero.png',
  '/marca/executivo-hero.jpg',
  '/marca/executivo-hero.webp',
];

// a foto é um retângulo com fundo (escritório, cidade): as bordas precisam
// derreter nos quatro lados, senão ela vira um selo colado na faixa. O
// desenho é recortado e não precisa disso — lá basta o pé sumindo.
const MASCARA_FOTO = [
  'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 12%, #000 40%, #000 86%, transparent 100%)',
  'linear-gradient(0deg, transparent 0%, #000 15%, #000 88%, transparent 100%)',
].join(', ');

export default function FiguraDoHero({ classeAltura = 'h-[220px]' }) {
  const [qual, setQual] = useState(0);
  const temFoto = qual < CAMINHOS.length;

  // 07/09, depois de ver no ar: o desenho vetorial não está à altura de um
  // painel executivo (dono: "esse desenho está me deixando puto"). Enquanto a
  // foto não sobe, a faixa fica LIMPA — vazio bem feito é melhor que desenho
  // ruim, e a frase "Qual é o seu poder?" segura a faixa sozinha. O desenho
  // continua no repositório (ExecutivoHero.jsx), fora do ar, caso um dia
  // sirva de reserva.
  if (!temFoto) return null;

  // 07/09 (3ª limpeza) — a altura vem em CLASSES Tailwind responsivas
  // (`h-[…] sm:h-[…] lg:h-[…]`), não mais num número + `transform: scale`.
  // O scale antigo só MUDA A PINTURA — a caixa no layout continuava do
  // tamanho do desktop em qualquer tela, e a foto (mais larga que o desenho
  // vetorial que ele substituiu) passou a estourar a largura no celular.
  // Com a altura de verdade mudando por breakpoint, a largura automática
  // (`w-auto`, pela proporção da imagem) acompanha corretamente em cada uma.
  return (
    <img
      src={CAMINHOS[qual]}
      alt=""
      aria-hidden="true"
      draggable="false"
      onError={() => setQual((n) => n + 1)}
      className={`pointer-events-none select-none w-auto object-cover ${classeAltura}`}
      style={{
        objectPosition: 'center top',
        WebkitMaskImage: MASCARA_FOTO,
        maskImage: MASCARA_FOTO,
        WebkitMaskComposite: 'source-in',
        maskComposite: 'intersect',
      }}
    />
  );
}
