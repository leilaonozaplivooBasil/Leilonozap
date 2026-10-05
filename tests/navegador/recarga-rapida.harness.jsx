/**
 * Banca da RECARGA RÁPIDA NA SALA (gaveta de saldo insuficiente) — NÃO vai pro app.
 *
 * Mede o que só a tela responde: a gaveta sobe com os 6 pacotes e o sugerido
 * marcado, o "digite o valor" vale, o PIX nasce aqui mesmo (mesma rota do
 * checkout), e quando o pagamento cai a sala recarrega o saldo e a gaveta fecha.
 * ?semEmail=1 → sem e-mail o botão manda pra tela completa.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import '@/index.css';
import LowBalanceModal from '@/components/auction/LowBalanceModal';

const semEmail = new URLSearchParams(window.location.search).get('semEmail') === '1';
const QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
window.__pagou = false;
window.__recargas = 0;
window.__maisOpcoes = 0;

function Sala() {
  const [aberto, setAberto] = useState(true);
  const [saldo, setSaldo] = useState(106.87);
  React.useEffect(() => {
    window.__plataformaFalsa.respostas = {
      createMPWalletDeposit: () => ({ success: true, payment_id: 'pg-1', pix_payload: '00020126PIXCOPIAECOLA', pix_qr_code: QR }),
      checkPaymentStatus: () => (window.__pagou ? { found: true, status: 'confirmed' } : { found: true, status: 'pending' }),
    };
  }, []);
  const usuario = { id: 'u1', full_name: 'Ângela Maria', email: semEmail ? '' : 'angela@x.com', cpf: '12345678909', phone: '21999990000' };
  return (
    <div style={{ minHeight: '100vh', padding: 16, color: 'white' }}>
      <p data-teste="saldo-da-sala">Saldo da sala: {saldo.toFixed(2)}</p>
      <button type="button" data-teste="dar-lance" onClick={() => setAberto(true)} style={{ padding: 12, background: '#f97316', borderRadius: 12 }}>Dar lance</button>
      <LowBalanceModal
        isOpen={aberto}
        currentBalance={saldo}
        requiredAmount={997}
        freteValor={0}
        currentUser={usuario}
        onSaldoAtualizado={async () => { window.__recargas += 1; setSaldo(1106.87); }}
        onWatchAsSpectator={() => setAberto(false)}
        onAddFunds={() => { window.__maisOpcoes += 1; }}
        onClose={() => setAberto(false)}
      />
      <Toaster richColors position="top-center" />
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Sala />);
