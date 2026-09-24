import React from 'react';

// 🎴 AS 8 PORTAS — a grade da CAPA (24/09/2026)
//
// Dono: "eu preciso de uma página onde eu tenha esse quadro, os oito hábitos
// do sucesso e a visão executiva do X-Game... para limpar mais a página,
// deixar a página mais bonita. Eu quero algo tudo muito limpo e muito fluido,
// porque eu estou sentindo muita informação."
//
// 🔴 POR QUE ELA SAIU DE DENTRO DO CrmClientesTab: lá ela vivia no meio de
// 2.900 linhas, e uma grade que não dá pra abrir sozinha é uma grade que
// ninguém confere antes de subir. Aqui ela renderiza na banca do navegador em
// dois segundos — foi assim que dava pra ver, ANTES de publicar, que os
// cartões precisavam de altura e do complemento do nome.
//
// A diferença pra grade antiga não é enfeite: na capa ela é a ÚNICA coisa na
// tela, então cabe o complemento ("de Networking", "e Convite") que a grade
// apertada não tinha onde pôr — e é justamente ele que ensina o que cada
// porta é, pra quem está chegando.
export default function PortasDosHabitos({ secoes = [], aoAbrir }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3" data-teste="nav-habitos">
      {secoes.map(({ id, n, nome, Icone, complemento }) => (
        <button
          key={id}
          type="button"
          onClick={() => aoAbrir?.(id)}
          data-teste={`porta-${id}`}
          className="group relative overflow-hidden rounded-xl border border-white/10 hover:border-white/30 px-3.5 py-4 sm:py-5 text-left transition-all hover:bg-white/[0.05]"
        >
          {/* 🔴 O ÍCONE SAIU DO LADO E FOI PRA CIMA. Ao lado, ele comia 32px
              (20 do traço + 12 do vão) de um cartão de meia tela — e
              "Acompanhamento", que é uma palavra só de 14 letras, quebrava no
              meio ("Acompanhame / nto"). Empilhado, o nome fica com o cartão
              inteiro e cabe numa linha. Duas tentativas anteriores (encolher
              a fonte, deixar quebrar) só escolheram entre dois defeitos; esta
              tira a causa. */}
          {Icone && <Icone className="w-[22px] h-[22px] text-white/40 group-hover:text-white/80 transition-colors mb-2.5" />}
          <span className="block text-[10px] font-bold tracking-[0.18em] text-white/35 group-hover:text-white/55">
            {String(n).padStart(2, '0')}
          </span>
          <span className="block text-[13.5px] sm:text-[15px] font-bold leading-tight text-white/85 group-hover:text-white break-words">
            {nome}
          </span>
          {complemento && (
            <span className="block text-[11px] leading-snug text-white/35 group-hover:text-white/55 mt-0.5 break-words">
              {complemento}
            </span>
          )}

          {/* o fio da marca acende de dentro pra fora ao passar o dedo: diz
              "isto abre" sem precisar de mais uma palavra na tela */}
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-300"
            style={{ background: 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-roxo), var(--topcollege-magenta))' }}
          />
        </button>
      ))}
    </div>
  );
}
