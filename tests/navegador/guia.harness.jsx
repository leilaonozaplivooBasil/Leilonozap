/**
 * Banca do celular na Top College — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (06/09/2026)
 * Dono: "no modo celular está com muito texto embaixo do Sonho, do
 * Compromisso… tem que ter um guia; a frase da faculdade pode entrar na
 * lateral, do lado da logo; e o cartão LOJA & VENDAS com o modal que ele abre
 * precisam ter a identidade visual da Top College. Só no celular, e não pode
 * ficar feio."
 *
 * Monta, na ordem em que aparecem na tela: o cartão de navegação (vestuário
 * Top College), a faixa da faculdade e um hábito com o guia móvel.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import MobileNavSheet from '@/components/licensing/MobileNavSheet';
import HeroTopCollege from '@/components/licensing/HeroTopCollege';
import GuiaMovel from '@/components/licensing/CentralVendas/GuiaMovel';
import FaixaVisao from '@/components/licensing/CentralVendas/FaixaVisao';
import RelogioDeTeste from '@/components/licensing/CentralVendas/RelogioDeTeste';

// 🧹 DIR-180 — a faixa ficou SÓ com as 5 visões. O relógio de teste saiu
// dela (RelogioDeTeste.jsx) e é montado longe da fileira — no app, no pé do
// placar. Aqui a banca monta os dois separados, como a tela faz.
function FaixaViva() {
  const [visao, setVisao] = React.useState('jornada');
  const [hora, setHora] = React.useState('');
  const [rascunho, setRascunho] = React.useState('');
  return (
    <div className="mb-5">
      <FaixaVisao visao={visao} onVisao={setVisao} />
      <div className="mt-2 flex justify-end" data-teste="pe-do-placar">
        <RelogioDeTeste teste={{ hora, rascunho, onRascunho: setRascunho, entrar: () => setHora(rascunho), sair: () => { setHora(''); setRascunho(''); } }} />
      </div>
      <span data-teste="estado-faixa">{JSON.stringify({ visao, hora })}</span>
    </div>
  );
}

const USUARIO = { id: 'u1', full_name: 'Luiz Santanna', email: 'luiz@x.com', role: 'admin', career_levels: ['usuario'] };

function Banca() {
  return (
    <MemoryRouter>
      <div style={{ minHeight: '100vh', background: 'var(--xeos-preto, #00020C)' }}>
        <div className="px-4 pt-4" data-teste="navegacao">
          <MobileNavSheet user={USUARIO} activeTab="catalogo" onTabChange={() => {}} topCollege />
        </div>
        <HeroTopCollege saudacao="Bom dia" nome="LUIZ" seletor={null} />
        <div className="xeos-palco px-3 py-6 sm:px-8" style={{ background: 'var(--xeos-preto, #00020C)' }} data-teste="palco">
          <FaixaViva />
          <p className="text-sm font-bold text-nz-tinta mb-2">Hábito 1 — Sonho</p>
          <GuiaMovel titulo="Como montar o seu quadro" className="border-t border-nz-borda/40 pt-4 text-xs text-nz-tinta-fraca">
            <span data-teste="texto-guia">
              🖼️ <strong>Monte o seu quadro.</strong> O sonho tem três prazos — ⚡ curto (1 a 2 anos), 🎯 médio (2 a 4) e 🏆 longo (5 pra frente).
              Coloque quantas imagens quiser em cada um e escreva os <strong>detalhes exatos</strong> embaixo de cada imagem. Sonho detalhado vira meta.
            </span>
          </GuiaMovel>
          <button type="button" data-teste="primeira-acao" className="mt-4 rounded-full bg-nz-verde text-white text-xs font-bold px-4 py-2">
            + adicionar sonho
          </button>
        </div>
      </div>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
