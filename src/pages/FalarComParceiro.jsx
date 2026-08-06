import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ArrowLeft, BadgeCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SeloCargo from '@/components/network/SeloCargo';
import AvisoAntifraude from '@/components/catalog/AvisoAntifraude';
import { levelName } from '@/lib/careerLevels';
import { cargoDoParceiro, podeFalarComigo, linkWhatsParceiro } from '@/lib/contatoParceiro';

/**
 * 📞 FalarComParceiro — ponte obrigatória entre a Loja Virtual e o WhatsApp do
 * parceiro. Antes de sair da plataforma a pessoa lê o aviso antifraude.
 *
 * Só parceiro oficial (Vendedor ou acima) tem WhatsApp exibido aqui.
 */
export default function FalarComParceiro() {
  const ref = new URLSearchParams(window.location.search).get('ref');
  const [parceiro, setParceiro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [entendi, setEntendi] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!ref) { setCarregando(false); return; }
      try {
        const achados = await base44.entities.AppUser.filter({ referral_code: ref });
        const p = achados && achados[0];
        if (vivo && p) {
          setParceiro({
            name: p.full_name || p.nickname || '',
            photo: p.profile_photo_url || p.avatar_url || null,
            phone: p.phone,
            career_levels: p.career_levels,
            primary_career_level: p.primary_career_level,
          });
        }
      } catch { /* sem parceiro → tela de aviso abaixo */ }
      if (vivo) setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [ref]);

  const liberado = podeFalarComigo(parceiro);
  const cargo = cargoDoParceiro(parceiro);
  const whats = linkWhatsParceiro(parceiro);
  const voltar = `/Loja-Virtual${ref ? `?ref=${ref}` : ''}`;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {carregando ? (
          <div className="space-y-3">
            <div className="h-20 rounded-2xl bg-gray-800 animate-pulse" />
            <div className="h-48 rounded-2xl bg-gray-800 animate-pulse" />
          </div>
        ) : (
          <>
            {/* Quem a pessoa vai contatar */}
            {liberado && (
              <section className="flex items-center gap-3 rounded-2xl border border-gray-700 bg-gray-800/60 p-3 sm:p-4">
                {parceiro.photo ? (
                  <img src={parceiro.photo} alt={parceiro.name} className="w-14 h-14 rounded-xl object-cover border border-green-500/40 shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-xl font-black shrink-0">
                    {(parceiro.name || 'L').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-green-400 font-bold leading-none">Loja Virtual</p>
                  <h1 className="text-white font-bold text-base sm:text-lg truncate leading-tight mt-0.5">{parceiro.name}</h1>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-emerald-300">
                    <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                    Parceiro oficial cadastrado{cargo ? ` · ${levelName(cargo)}` : ''}
                  </p>
                </div>
                {cargo && (
                  <div className="w-14 h-14 shrink-0" title={levelName(cargo)}>
                    <SeloCargo cargo={cargo} title={levelName(cargo)} />
                  </div>
                )}
              </section>
            )}

            <div className="mt-4">
              <AvisoAntifraude />
            </div>

            {/* Quadradinho "Entendi" — libera o botão de continuar pro WhatsApp */}
            {liberado && (
              <label className="mt-4 flex items-start gap-3 cursor-pointer rounded-xl border border-gray-700 bg-gray-800/60 p-3.5">
                <input
                  type="checkbox"
                  checked={entendi}
                  onChange={(e) => setEntendi(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-green-500 cursor-pointer"
                />
                <span className="text-[13.5px] leading-relaxed text-gray-200 font-semibold">
                  Entendi. Vou pagar somente dentro da plataforma e não vou enviar dinheiro por fora.
                </span>
              </label>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              {liberado && (
                <a
                  href={entendi ? whats : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!entendi}
                  onClick={(e) => { if (!entendi) e.preventDefault(); }}
                  className={`flex-1 min-h-[52px] flex items-center justify-center gap-2 rounded-xl font-bold transition-colors ${
                    entendi
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <MessageCircle className="w-5 h-5" />
                  Entendi, continuar
                </a>
              )}
              <Link
                to={voltar}
                className="flex-1 min-h-[52px] flex items-center justify-center gap-2 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-100 font-bold transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Voltar para a loja
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}