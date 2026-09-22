/**
 * Banca da JANELA DO MAR — NÃO vai para o bundle do app.
 *
 * Mostra a lâmina de ABERTURA do Ritual do Amanhecer como ela fica de
 * verdade: o fundo de mar em CSS, a janela por cima, a pílula da música e o
 * contrato dos três blocos. É aqui que se confere o que o dono pediu em
 * 22/09 — "menos cara de aplicativo feito por IA", "esses textos mais
 * visíveis" e "que ela sinta que está no mar nessa lâmina".
 *
 * `?luz=0..1` pinta a mesma janela em outro momento do nascer do sol (0 = hora
 * azul da abertura, 1 = sol alto do fechamento), pra conferir se o texto
 * continua legível com a luz toda.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import XGameRitualAmanhecer from '@/components/licensing/CentralVendas/XGameRitualAmanhecer';
import FundoJanelaDoMar from '@/components/licensing/CentralVendas/FundoJanelaDoMar';

const parametros = new URLSearchParams(window.location.search);
const luz = parametros.get('luz');

function Banca() {
  // só o fundo, pra olhar a pintura sem o conteúdo por cima
  if (luz !== null) {
    return (
      <div className="fixed inset-0 bg-[#070E18]">
        <FundoJanelaDoMar luz={Number(luz)} />
      </div>
    );
  }
  return (
    <XGameRitualAmanhecer
      nome="LUIZ"
      sonhos={[]}
      diaCorridoCiclo={3}
      comprovacaoAtual={null}
      onBloco={() => {}}
      onFechar={() => {}}
      onConcluir={() => {}}
      onExplicar={() => {}}
      onRefazer={() => {}}
      onPedirAjuda={() => {}}
    />
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
