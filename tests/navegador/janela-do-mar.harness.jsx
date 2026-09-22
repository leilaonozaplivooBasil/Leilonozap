/**
 * Banca da JANELA DO MAR — NÃO vai para o bundle do app.
 *
 * Mostra a lâmina de ABERTURA do Ritual do Amanhecer como ela fica de
 * verdade: o fundo, a janela por cima, a pílula da música e o contrato dos
 * três blocos. É aqui que se confere o que o dono pediu em 22/09 — "menos
 * cara de aplicativo feito por IA", "esses textos mais visíveis" e "que ela
 * sinta que está no mar nessa lâmina".
 *
 * `?luz=0..1` pinta a mesma janela em outro momento do nascer do sol (0 = hora
 * azul da abertura, 1 = sol alto do fechamento), pra conferir se o texto
 * continua legível com a luz toda.
 *
 * `?foto=<url>` troca o fundo desenhado por uma FOTO qualquer — é assim que
 * se mede NA TELA o que a resolução de um arquivo aguenta, antes de decidir.
 *
 * Pra chegar na 2ª lâmina (o DESPERTAR), a banca aperta "Começar o ritual",
 * igual a pessoa faria — nenhum atalho entra no componente só por causa
 * de teste.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import XGameRitualAmanhecer from '@/components/licensing/CentralVendas/XGameRitualAmanhecer';
import FundoJanelaDoMar from '@/components/licensing/CentralVendas/FundoJanelaDoMar';
const parametros = new URLSearchParams(window.location.search);
const luz = parametros.get('luz');
// `?foto=<url>` aceita QUALQUER endereço de imagem: é assim que se mede na
// tela, antes de decidir, o que a resolução de um arquivo aguenta. Nenhuma
// foto de banco entra no projeto — ver DIR-171.
const foto = parametros.get('foto');

function Banca() {
  // só o fundo, pra olhar a pintura sem o conteúdo por cima
  if (luz !== null) {
    return (
      <div className="fixed inset-0 bg-[#070E18]">
        <FundoJanelaDoMar luz={Number(luz)} foto={foto || null} />
      </div>
    );
  }
  return (
    <XGameRitualAmanhecer
      nome="LUIZ"
      sonhos={[]}
      diaCorridoCiclo={3}
      comprovacaoAtual={null}
      fotoDeFundo={foto || null}
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
