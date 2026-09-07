import React, { useState } from 'react';
import ExecutivoHero from './ExecutivoHero';

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

export default function FiguraDoHero({ altura = 220 }) {
  const [qual, setQual] = useState(0);
  const temFoto = qual < CAMINHOS.length;

  if (!temFoto) {
    return (
      <div
        className="relative origin-bottom"
        style={{
          filter: 'drop-shadow(0 14px 30px rgba(0,2,12,0.72))',
          WebkitMaskImage: 'linear-gradient(0deg, transparent 0%, #000 14%)',
          maskImage: 'linear-gradient(0deg, transparent 0%, #000 14%)',
        }}
      >
        <ExecutivoHero altura={altura} />
      </div>
    );
  }

  return (
    <img
      src={CAMINHOS[qual]}
      alt=""
      aria-hidden="true"
      draggable="false"
      onError={() => setQual((n) => n + 1)}
      className="pointer-events-none select-none w-auto object-cover"
      style={{
        height: altura,
        objectPosition: 'center top',
        WebkitMaskImage: MASCARA_FOTO,
        maskImage: MASCARA_FOTO,
        WebkitMaskComposite: 'source-in',
        maskComposite: 'intersect',
      }}
    />
  );
}
