/**
 * Banca do POP-UP DO LEILÃO — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (20/09/2026)
 * O dono pediu: "cada vez que o usuário entrar em uma página é necessário que
 * estoure o pop-up do leilão do PS5 com botão para dar lance".
 *
 * A regra de QUANDO aparecer (`src/lib/popupLeilaoDestaque.js`) é JS puro e já
 * tem 25 provas no Node. Mas a regra sozinha não responde à demanda: ela só diz
 * "pode aparecer nesta página". Quem precisava mudar para o pop-up VOLTAR ao
 * navegar é o componente — o `useRef` que travava em uma tentativa por montagem
 * e nunca mais consultava, porque o Layout monta este componente uma vez só.
 *
 * Ler o arquivo prova que o ref mudou de nome. Só a tela prova que, trocando de
 * página, o pop-up realmente volta. É isso que esta banca mede.
 *
 * O botão "ir para outra página" troca o `currentPageName` sem desmontar o
 * componente — que é exatamente o que o react-router faz no site real.
 *
 * `?pagina=X` começa numa página específica (para provar as páginas proibidas).
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import PopupLeilaoDestaque from '@/components/common/PopupLeilaoDestaque';
import fotoPS5 from './ps5-de-prova.png';
import { CHAVE_CONSENTIMENTO } from '@/lib/popupLeilaoDestaque';

const params = new URLSearchParams(window.location.search);

// O consentimento LGPD já aceito: sem isto o pop-up espera, e com razão — os
// dois disputam a primeira visita. Aqui queremos medir o pop-up, não a espera.
try { localStorage.setItem(CHAVE_CONSENTIMENTO, '1'); } catch { /* segue */ }
try { sessionStorage.clear(); } catch { /* segue */ }

const FIM = new Date(Date.now() + 6 * 3600 * 1000).toISOString();

window.__entidadesFalsas = {
  BannerImage: [{
    id: 'popup-1', context: 'popup_leilao', is_active: true,
    title: 'Playstation 5',
    image_url: params.get('semfoto') ? 'https://exemplo.invalido/x.jpg' : fotoPS5,
    link_url: '/AuctionRoom?id=ps5-de-mentira',
  }],
  Auction: [{
    id: 'ps5-de-mentira', title: 'Playstation 5', status: 'active',
    end_time: FIM, current_price: 797,
    image_urls: [fotoPS5],
  }],
};

const PAGINAS = ['Home', 'Loja-Virtual', 'leiloes', 'Home'];

function Banca() {
  const [i, setI] = useState(0);
  const pagina = params.get('pagina') || PAGINAS[i % PAGINAS.length];

  return (
    <MemoryRouter>
      <div style={{ padding: 24, color: '#e5e7eb', fontFamily: 'system-ui' }}>
        <p data-teste="pagina-atual">{pagina}</p>
        <button
          type="button"
          data-teste="navegar"
          onClick={() => setI((n) => n + 1)}
          style={{ padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}
        >
          ir para outra página
        </button>
      </div>
      <PopupLeilaoDestaque currentPageName={pagina} />
    </MemoryRouter>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
