import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ParceiroSecao from './ParceiroSecao';

// Foto oficial fornecida pela diretoria (não está no cadastro do sistema).
const FOTO_DIOGO = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/59c89b643_image.png';

const MEMBROS = [
  {
    cargo: 'Fundador e CEO',
    nome: "Luiz Sant'Anna",
    bio: "Ex-Fuzileiro Naval, com trajetória em Sky e Nextel. Originou mais de R$ 100M no mercado financeiro e captou R$ 22M em ambiente digital. Fundador da X-EOS. Representante legal signatário dos contratos.",
  },
  {
    cargo: 'Sócio institucional',
    nome: 'Luciano Pinheiro',
    bio: 'Sócio da Trino Instituição de Pagamentos. Histórico em negociação de contratos B2B de grande porte, incluindo parcerias com indústrias como a EMS. Responde pela governança financeira da operação.',
  },
  {
    cargo: 'Sócio de tecnologia',
    nome: 'Diogo Archanjo',
    bio: 'CMO da Phizchat e CEO da Ingoobrasil. Responsável pela arquitetura tecnológica, escalabilidade de tráfego e pela esteira digital que sustenta os canais próprios de venda.',
    foto: FOTO_DIOGO,
  },
];

const iniciais = (nome) => nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('');

export default function ParceiroBoard() {
  const [fotos, setFotos] = useState({});

  // Busca as fotos de perfil no próprio cadastro. Quem não tiver, exibe as iniciais.
  useEffect(() => {
    let ativo = true;
    Promise.all(
      MEMBROS.filter((m) => !m.foto).map((m) =>
        base44.entities.AppUser.filter({ full_name: m.nome })
          .then((r) => [m.nome, r?.[0]?.profile_photo_url || r?.[0]?.avatar_url || null])
          .catch(() => [m.nome, null])
      )
    ).then((pares) => { if (ativo) setFotos(Object.fromEntries(pares)); });
    return () => { ativo = false; };
  }, []);

  return (
    <ParceiroSecao numero="07" rotulo="Quem opera" referencia="Board executivo">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
          O board <span className="text-pc-ouro">executivo</span>
        </h2>
        <p className="text-sm leading-relaxed text-pc-tinta-fraca lg:text-right">
          Liderança com histórico em estruturação financeira,
          <br className="hidden sm:block" /> operação institucional e tecnologia.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 border-l border-pc-borda pl-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
        {MEMBROS.map((m) => {
          const foto = m.foto || fotos[m.nome];
          return (
            <div key={m.nome}>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-pc-ouro bg-pc-preto-2">
                  {foto ? (
                    <img
                      src={foto}
                      alt={m.nome}
                      className="h-full w-full object-cover grayscale"
                      loading="lazy"
                      decoding="async"
                      width={160}
                      height={160}
                    />
                  ) : (
                    <span className="text-lg font-bold text-pc-ouro">{iniciais(m.nome)}</span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase leading-relaxed tracking-[0.2em] text-pc-ouro">{m.cargo}</p>
                  <h3 className="mt-1 text-lg font-bold text-pc-tinta sm:text-xl">{m.nome}</h3>
                </div>
              </div>
              <p className="mt-5 border-t border-pc-borda pt-5 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">
                {m.bio}
              </p>
            </div>
          );
        })}
      </div>
    </ParceiroSecao>
  );
}