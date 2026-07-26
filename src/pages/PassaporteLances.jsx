import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import logoNozap from '@/assets/leilao-nozap-logo.png';

const VALOR = 100;
const ACEITES = [
  'Li e compreendi os Termos e Condições do Passaporte de Lances.',
  'Concordo que o valor pago é IRRESTORNÁVEL após a confirmação do pagamento.',
  'Compreendo que o saldo é crédito de uso exclusivo dentro da plataforma Leilão NoZap.',
  'Estou ciente dos prazos de validade: 90 dias para o saldo e 30 dias para os acessos de lance.',
  'Reconheço o benefício de 30% de desconto na Loja Virtual caso eu participe e não arremate.',
];

export default function PassaporteLances() {
  const navigate = useNavigate();
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; } })();
  const [checks, setChecks] = useState(Array(ACEITES.length).fill(false));
  const [meuPassaporte, setMeuPassaporte] = useState(null);
  const todosMarcados = checks.every(Boolean);

  useEffect(() => {
    if (!currentUser?.id) return;
    base44.entities.Passaporte?.filter?.({ user_id: currentUser.id, status: 'ativo' })
      .then((rows) => { if (Array.isArray(rows) && rows.length) setMeuPassaporte(rows[0]); })
      .catch(() => {});
  }, [currentUser?.id]);

  const comprar = () => {
    if (!currentUser?.id) { navigate(createPageUrl('Cadastro')); return; }
    if (!todosMarcados) return;
    // reaproveita o checkout de depósito, marcando como 'passaporte' (webhook credita R$100 + cria o passaporte)
    navigate(createPageUrl('AuctionCheckoutModern'), { state: { amount: VALOR, depositType: 'passaporte', returnTo: window.location.pathname + window.location.search } });
  };

  const Beneficio = ({ icon, titulo, texto }) => (
    <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
      <span className="text-2xl">{icon}</span>
      <div><p className="font-bold text-sm">{titulo}</p><p className="text-xs text-green-200/80">{texto}</p></div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 50% -10%, #0f3d2e 0%, #071b14 45%, #05100c 100%)' }} className="text-white w-full overflow-x-hidden">
      <div className="max-w-2xl w-full mx-auto px-4 py-8 pb-24">

        <div className="text-center">
          <img src={logoNozap} alt="Leilão NoZap" className="mx-auto w-28 h-28 object-contain drop-shadow-xl" />
          <div className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-black tracking-wider" style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)', color: '#052e16' }}>PASSAPORTE DE LANCES</div>
          <h1 className="font-black mt-3" style={{ fontSize: 'clamp(1.8rem,8vw,2.6rem)', lineHeight: 1 }}>
            R$ 100 que <span style={{ color: '#f5c451' }}>viram R$ 100</span>
          </h1>
          <p className="text-green-200/90 mt-2 font-semibold text-sm">Você NÃO perde nada. É crédito pra usar, não aposta. 🎟️</p>
        </div>

        {/* já tem passaporte */}
        {meuPassaporte && (
          <div className="mt-6 rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg,#166534,#052e16)', border: '1px solid rgba(245,196,81,.4)' }}>
            <p className="font-black">🎟️ Você já tem um Passaporte ativo</p>
            <p className="text-sm text-green-200 mt-1">{meuPassaporte.acessos_restantes} de {meuPassaporte.acessos_total} acessos de lance restantes</p>
          </div>
        )}

        {/* O que você recebe */}
        <div className="mt-6 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,196,81,.3)' }}>
          <p className="font-black text-lg mb-3">🎁 O que você recebe por R$ 100</p>
          <div className="grid gap-2">
            <Beneficio icon="💰" titulo="R$ 100 de crédito na carteira" texto="Integral. Usa em lance ou na Loja Virtual." />
            <Beneficio icon="🔨" titulo="20 acessos de lance" texto="Entra nos leilões exclusivos do Passaporte." />
            <Beneficio icon="🛍️" titulo="Se não arrematar, usa na loja" texto="Loja com preços até 60% abaixo. Não arrematou? 30% de desconto extra." />
            <Beneficio icon="⏱️" titulo="Validade justa" texto="Saldo por 90 dias, acessos por 30 dias." />
          </div>
        </div>

        {/* Aviso legal */}
        <div className="mt-6 rounded-2xl p-4" style={{ background: 'rgba(255,196,81,.06)', border: '1px solid rgba(245,196,81,.25)' }}>
          <p className="text-xs text-green-100/90 leading-relaxed">
            O valor investido no Passaporte de Lances <b>não constitui depósito bancário, pagamento por sorte ou aposta</b>, mas sim
            antecipação de crédito para consumo dentro do ecossistema Leilão NoZap, podendo ser integralmente utilizado na aquisição de
            produtos, seja via leilão ou via Loja Virtual, conforme os Termos de Uso. O valor é <b>irrestornável</b> após a confirmação do
            pagamento (salvo falha técnica comprovada da plataforma, art. 18 CDC).
          </p>
        </div>

        {/* Aceites */}
        <div className="mt-4 space-y-2">
          {ACEITES.map((txt, i) => (
            <label key={i} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer">
              <input type="checkbox" checked={checks[i]} onChange={() => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))}
                className="mt-0.5 w-5 h-5 accent-green-500 flex-shrink-0" />
              <span className="text-xs text-green-100/90">{txt}</span>
            </label>
          ))}
        </div>

        {/* Comprar */}
        <button onClick={comprar} disabled={!todosMarcados}
          className="mt-5 w-full py-4 rounded-xl font-black text-lg text-[#052e16] disabled:opacity-40 transition-opacity"
          style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)' }}>
          {currentUser?.id ? '🎟️ COMPRAR PASSAPORTE · R$ 100 no PIX' : 'CRIAR CONTA PRA PARTICIPAR'}
        </button>
        {!todosMarcados && <p className="text-center text-[11px] text-green-300/60 mt-2">Marque os itens acima pra liberar a compra.</p>}

        <p className="text-center text-[11px] text-green-300/40 mt-8">Passaporte de Lances · Leilão NoZap · crédito antecipado de consumo, nunca aposta.</p>
      </div>
    </div>
  );
}
