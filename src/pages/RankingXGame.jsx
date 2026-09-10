import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import XGameVisaoExecutiva from '@/components/licensing/CentralVendas/XGameVisaoExecutiva';

// 🏆 RANKING X-GAME — o link compartilhável do ranking do dia (DIR-138,
// 10/09/2026). Dono: "eu preciso ter um local de compartilhamento do
// ranking do dia, junto com o primeiro, o segundo e o terceiro lugar...
// exatamente como é visto hoje no pódio." Em vez de duplicar a conta do
// pódio/tabela (risco real de desalinhar de novo, como o ADM e a Visão
// Executiva já tinham desalinhado), esta tela é só uma moldura enxuta em
// volta da MESMA XGameVisaoExecutiva que a Verificação do Progresso usa —
// mesmos números, sempre, sem segunda fonte de verdade pra manter igual.
export default function RankingXGame() {
  const navigate = useNavigate();
  const [logado, setLogado] = useState(null); // null = ainda checando
  useEffect(() => {
    try { setLogado(!!JSON.parse(localStorage.getItem('currentUser') || 'null')?.id); } catch { setLogado(false); }
  }, []);

  if (logado === null) return <div className="min-h-screen bg-[#00020C] text-[#F4F4F4] flex items-center justify-center">Carregando o ranking…</div>;
  if (!logado) return <div className="min-h-screen bg-[#00020C] text-[#F4F4F4] flex items-center justify-center">Entre na sua conta pra ver o ranking do X-GAME.</div>;

  return (
    <div className="min-h-screen bg-[#00020C] text-[#F4F4F4]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <button type="button" onClick={() => navigate('/XGame')} className="flex items-center gap-1.5 text-[12px] text-[#817E8C] hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> voltar pro X-GAME
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Ranking X-GAME</h1>
        <p className="text-[13px] text-[#817E8C] mb-6">O pódio do ciclo e o time inteiro — sempre atualizado, o mesmo número em qualquer tela.</p>
        <XGameVisaoExecutiva />
      </div>
    </div>
  );
}
