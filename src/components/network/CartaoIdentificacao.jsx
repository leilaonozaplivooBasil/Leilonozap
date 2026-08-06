import React from 'react';
import { getFotoPerfil } from '@/lib/selosCargo';

const iniciais = (nome) => {
  const p = (nome || '').trim().split(' ').filter(Boolean);
  if (!p.length) return '??';
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
};

/**
 * 🪪 CartaoIdentificacao — balãozinho que aparece no hover do nó da árvore:
 * FOTO REAL da pessoa + nome + cargo. Serve pra identificar quem é sem
 * precisar abrir o perfil (o selo do cargo continua no círculo).
 */
export default function CartaoIdentificacao({ user, cargoNome, cargoCor = 'bg-slate-500' }) {
  const foto = getFotoPerfil(user);
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-gray-600 bg-gray-900/98 px-2.5 py-2 shadow-2xl">
      <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ring-1 ring-white/15">
        {foto ? (
          <img src={foto} alt="" className="w-full h-full object-cover" draggable={false} />
        ) : (
          iniciais(user?.full_name)
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-white leading-tight whitespace-nowrap">
          {user?.full_name || 'Sem nome'}
        </p>
        <span className={`inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${cargoCor} text-white`}>
          {cargoNome}
        </span>
        {!foto && (
          <p className="text-[10px] text-gray-500 leading-tight mt-0.5 whitespace-nowrap">sem foto no perfil</p>
        )}
      </div>
    </div>
  );
}