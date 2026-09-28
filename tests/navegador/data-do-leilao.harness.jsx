/**
 * Banca do CARD DE LEILÃO DE VERDADE — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (17/09/2026)
 * O contador do card tem resolução de SEMANA: "1 semana" cobre de 7,00 a 13,99
 * dias e fica parado sete dias seguidos. Foi o que gerou o chamado da Caixa de
 * Som Mondial em 03/09 — e o que a Beatriz cobriu de novo agora, nos relógios.
 *
 * A régua `textoDeTermino` já existia e já estava na sala, nos detalhes e no
 * painel fixo. O card, que é a PRIMEIRA tela que quase todo mundo vê, tinha
 * ficado de fora. Ler o arquivo prova que a linha existe; só a tela prova que
 * ela aparece ao lado do "1 semana", e não no lugar dele.
 *
 * `?encerrado=1` repete um leilão já terminado — que NÃO pode mostrar a linha.
 * `?semdata=1` repete um leilão sem end_time — que também não pode.
 *
 * 🎬 17/09/2026 — a mesma banca serve o VÍDEO NO DESTAQUE:
 * `?video=1`    card com vídeo de arquivo (o caso do PS5)
 * `?video=quebrado` vídeo cujo endereço não existe — não pode deixar buraco
 * `?youtube=1`  vídeo de embed (iframe), que NÃO toca sozinho
 * `?inativo=1`  card que TEM vídeo mas não é o primeiro destaque: não toca
 *
 * 🏷️ 19/09/2026 — e o SELO "NOVO - Com Garantia":
 * `?garantia=1`   card de fábrica, que mostra o selo
 * `?largura=NNN`  largura do card, para medir o selo no card estreito
 * `?favorito=1`   liga o botão de coração — ele só aparece com usuário logado,
 *                 e SEM ele a banca media a colisão do selo contra um botão só,
 *                 quando na tela real são dois (foi assim que a primeira versão
 *                 desta medição quase aprovou uma sobreposição)
 *
 * ↙️ 28/09/2026 — o selo foi para o CANTO INFERIOR ESQUERDO, onde já moram
 * outras coisas. Para medir cada vizinho:
 * `?fotos=N`   N fotos → aparecem as bolinhas do carrossel
 * `?legenda=1` a foto tem legenda (faixa escura no pé)
 * `?admin=1`   mostra o lápis de editar, no canto inferior direito
 *
 * ⏳ 28/09/2026 — "cards de leilões seguem sem vídeo":
 * `?video=prova`     vídeo que TOCA de verdade (webm pequeno da banca)
 * `?videoDepois=MS`  o vídeo chega MS depois do card — como na Home, onde os
 *                    destaques aparecem primeiro e os vídeos vêm numa 2ª consulta
 */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import AuctionCard from '@/components/auction/AuctionCard';
import videoDeProva from './falso/video-de-prova.webm';

window.__bancoFalso = { tabelas: {}, escritas: [] };
window.__entidadesFalsas = { Auction: [], AppUser: [] };

const params = new URLSearchParams(window.location.search);

// 12 dias à frente, fixo: cai na faixa em que o contador diz "1 semana"
const DOZE_DIAS = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();
const ONTEM = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const leilao = {
  id: 'banca-1',
  title: 'Playstation 5',
  description: 'Console de teste da banca',
  image_urls: Array.from({ length: Number(params.get('fotos')) || 1 }, () => (
    PIXEL + (params.get('legenda') === '1' ? '#txt=Caixa%20lacrada%20de%20f%C3%A1brica' : '')
  )),
  starting_price: 497,
  current_price: 597,
  increment: 100,
  category: 'eletronicos',
  status: params.get('encerrado') === '1' ? 'ended' : 'active',
  end_time: params.get('semdata') === '1' ? null : (params.get('encerrado') === '1' ? ONTEM : DOZE_DIAS),
  // 🏷️ só produto de fábrica mostra o selo "NOVO - Com Garantia"
  ...(params.get('garantia') === '1' ? { product_source: 'factory_new' } : {}),
};

// o `video` chega no card como prop pronta (quem monta é DestaquesLeiloes,
// usando a MESMA régua videoDoProduto da loja e da sala)
const video = params.get('youtube') === '1'
  ? { tipo: 'youtube', embed: 'https://www.youtube.com/embed/abc123' }
  : params.get('video')
    ? { tipo: 'arquivo', embed: params.get('video') === 'quebrado' ? '/nao-existe.mp4' : params.get('video') === 'prova' ? videoDeProva : '/ps5-de-mentira.mp4' }
    : null;

const DEPOIS = Number(params.get('videoDepois')) || 0;

function Banca() {
  // como a Home: o card nasce sem vídeo e o vídeo chega depois
  const [videoAgora, setVideoAgora] = useState(DEPOIS ? null : video);
  useEffect(() => {
    if (!DEPOIS) return undefined;
    const t = setTimeout(() => setVideoAgora(video), DEPOIS);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ padding: 24, maxWidth: Number(params.get('largura')) || 420 }}>
      <AuctionCard
        auction={leilao}
        video={videoAgora}
        videoAtivo={params.get('inativo') !== '1'}
        isAdmin={params.get('admin') === '1'}
        showFavoriteButton={params.get('favorito') === '1'}
        userId={params.get('favorito') === '1' ? 'banca-usuario' : null}
      />
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <Banca />
  </MemoryRouter>
);
