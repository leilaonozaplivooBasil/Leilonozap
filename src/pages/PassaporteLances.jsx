import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import CartaoPassaporte from '@/components/passaporte/CartaoPassaporte';
import BeneficiosPassaporte from '@/components/passaporte/BeneficiosPassaporte';
import AvisoLegalPassaporte from '@/components/passaporte/AvisoLegalPassaporte';
import AceitesPassaporte, { ACEITES_PASSAPORTE } from '@/components/passaporte/AceitesPassaporte';
import { registrarAceitePassaporte } from '@/lib/passaporteTermo';
import { obterOrigemDeposito } from '@/lib/origemDeposito';

const VALOR = 100;
const CREDITO = 110;

export default function PassaporteLances() {
  const navigate = useNavigate();
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; } })();
  const [checks, setChecks] = useState(Array(ACEITES_PASSAPORTE.length).fill(false));
  const [meuPassaporte, setMeuPassaporte] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const todosMarcados = checks.every(Boolean);

  useEffect(() => {
    if (!currentUser?.id) return;
    base44.entities.Passaporte?.filter?.({ user_id: currentUser.id, status: 'ativo' })
      .then((rows) => { if (Array.isArray(rows) && rows.length) setMeuPassaporte(rows[0]); })
      .catch(() => {});
  }, [currentUser?.id]);

  const comprar = async () => {
    if (!currentUser?.id) { navigate(createPageUrl('Cadastro')); return; }
    if (!todosMarcados || enviando) return;
    setEnviando(true);
    // 🔒 O aceite é registrado ANTES de liberar o pagamento (trilha de auditoria).
    await registrarAceitePassaporte(currentUser);
    setEnviando(false);
    // 🧭 PONTO 69: volta pra ORIGEM real (sala do leilão, loja, home) — nunca
    // pra esta própria página, senão o usuário paga e cai na tela de pagar de novo.
    navigate(createPageUrl('AuctionCheckoutModern'), {
      state: { amount: VALOR, depositType: 'passaporte', returnTo: obterOrigemDeposito() },
    });
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden text-white" style={{ background: '#0B0F0D' }}>
      <div className="max-w-xl w-full mx-auto px-4 py-10 pb-24">

        <header className="text-center mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">Passaporte de Lances</p>
          <h1 className="mt-3 font-semibold text-white" style={{ fontSize: 'clamp(1.7rem,7vw,2.3rem)', lineHeight: 1.1 }}>
            R$ 100 que valem <span className="text-emerald-300">R$ 110</span>
          </h1>
          <p className="mt-3 text-sm text-white/55 leading-relaxed">
            Não é aposta. É crédito de consumo na sua carteira — para disputar ou comprar na Loja Virtual.
          </p>
        </header>

        <CartaoPassaporte
          titular={currentUser?.full_name}
          valorPago={VALOR}
          credito={CREDITO}
          ativo={Boolean(meuPassaporte)}
        />

        {meuPassaporte && (
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] px-4 py-3 text-center">
            <p className="text-sm font-medium text-emerald-200">Você já tem um Passaporte ativo</p>
            <p className="text-xs text-white/55 mt-0.5">Seu crédito está na carteira, sem prazo para usar.</p>
          </div>
        )}

        <div className="mt-5"><BeneficiosPassaporte /></div>
        <div className="mt-5"><AvisoLegalPassaporte /></div>

        <div className="mt-5">
          <AceitesPassaporte
            checks={checks}
            onToggle={(i) => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))}
          />
        </div>

        <button
          onClick={comprar}
          disabled={!todosMarcados || enviando}
          className="mt-6 w-full min-h-[52px] rounded-xl font-semibold text-[15px] bg-emerald-500 text-[#04150D] hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/40 transition-colors"
        >
          {!currentUser?.id
            ? 'Criar conta para participar'
            : enviando
              ? 'Registrando aceite...'
              : `Comprar Passaporte · R$ ${VALOR} no PIX`}
        </button>
        {!todosMarcados && (
          <p className="text-center text-[11px] text-white/40 mt-2.5">
            Aceite os termos acima para liberar o pagamento.
          </p>
        )}

        <p className="text-center text-[11px] text-white/25 mt-10 leading-relaxed">
          Passaporte de Lances · Leilão NoZap<br />crédito antecipado de consumo, nunca aposta.
        </p>
      </div>
    </div>
  );
}