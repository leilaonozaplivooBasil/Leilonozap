import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { estaEmCartaz } from '@/lib/leilaoEmCartaz';
import { categoriasDaVitrine, leiloesDaSemana, maisValiosos, quantosDestaques, numerosDaCasa } from '@/lib/homeNova';
import TopoHomeNova from '@/components/homenova/TopoHomeNova';
import HeroDoDia from '@/components/homenova/HeroDoDia';
import ExplorePorCategoria from '@/components/homenova/ExplorePorCategoria';
import FaixaDeNumeros from '@/components/homenova/FaixaDeNumeros';
import CarrosselDeLeiloes from '@/components/homenova/CarrosselDeLeiloes';
import BlocoParceiro from '@/components/homenova/BlocoParceiro';
import SelosDeConfianca from '@/components/homenova/SelosDeConfianca';
import RodapeHomeNova from '@/components/homenova/RodapeHomeNova';

// 🏠 HOME NOVA — página de entrada repaginada (preview).
//
// ⚠️ ESTA PÁGINA AINDA NÃO É A "/" — vive em /HomeNova para aprovação. A troca
// da raiz é passo separado, junto com a decisão sobre o HomeGate (hoje quem está
// logado nunca vê a home: vai direto pros leilões).
//
// Toda seção lê do banco. Se a consulta falhar, a seção correspondente some em
// vez de mostrar exemplo — é o que impede a home de afirmar o que não existe.
export default function HomeNova() {
  const navigate = useNavigate();
  const [destaques, setDestaques] = useState([]);
  const [daSemana, setDaSemana] = useState([]);
  const [precoNaLoja, setPrecoNaLoja] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [numeros, setNumeros] = useState([]);

  useEffect(() => {
    let vivo = true;

    (async () => {
      // 1) Destaques: a curadoria manual que já existe (featured_products), a
      //    mesma que alimenta a Home de leilões. Encerrado não entra.
      try {
        const { data: marcados } = await supabase
          .from('featured_products')
          .select('sort_order,is_active,raw_base44')
          .limit(50);
        const ids = (marcados || [])
          .filter((r) => r.raw_base44?.auction_id && r.is_active !== false)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .slice(0, 8)
          .map((r) => r.raw_base44.auction_id);
        if (ids.length) {
          const { data } = await supabase.from('auctions').select('*').in('id', ids);
          const porId = Object.fromEntries((data || []).map((a) => [a.id, a]));
          if (vivo) setDestaques(ids.map((id) => porId[id]).filter((a) => a && estaEmCartaz(a)));
        }
      } catch { /* seção some */ }

      // 2) Da semana: termina nos próximos 7 dias. A régua está em homeNova.js.
      let ativos = [];
      try {
        const { data } = await supabase
          .from('auctions')
          .select('*')
          .eq('status', 'active')
          .gt('end_time', new Date().toISOString())
          .order('end_time', { ascending: true })
          .limit(60);
        ativos = data || [];
        if (vivo) setDaSemana(ativos);
      } catch { /* seção some */ }

      // 💰 O preço do MESMO produto na nossa loja — é o que ordena o "Em
      // destaque" e o que o card mostra ao lado do lance. Uma consulta só,
      // nunca uma por card.
      try {
        const ids = [...new Set(ativos.map((a) => a.product_id).filter(Boolean))];
        if (ids.length) {
          const { data } = await supabase.from('products').select('id,price_catalog').in('id', ids);
          if (vivo) setPrecoNaLoja(Object.fromEntries((data || []).map((p) => [p.id, Number(p.price_catalog) || 0])));
        }
      } catch { /* o card só não mostra a comparação */ }

      // 3) Categorias: a view amarra o leilão à categoria DO PRODUTO.
      try {
        const { data } = await supabase
          .from('vw_home_categorias')
          .select('id,nome,leiloes_ativos,produtos_na_loja,imagem')
          .limit(40);
        if (vivo) setCategorias(categoriasDaVitrine(data));
      } catch { /* seção some */ }

      // 4) Números: contagem de verdade, nunca número de enfeite.
      try {
        const [ativos, naLoja, acervo] = await Promise.all([
          supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('catalog_active', true),
          supabase.from('products').select('id', { count: 'exact', head: true }),
        ]);
        if (vivo) {
          setNumeros(numerosDaCasa({
            leiloesAtivos: ativos?.count,
            produtosNaLoja: naLoja?.count,
            acervo: acervo?.count,
          }));
        }
      } catch {
        if (vivo) setNumeros(numerosDaCasa({}));
      }
    })();

    return () => { vivo = false; };
  }, []);

  // 🎯 O hero continua sendo SEU: é o primeiro leilão que você marca à mão em
  // featured_products. Só ele é curadoria manual.
  const heroi = destaques[0] || daSemana[0] || null;

  // 💎 "Em destaque" passou a se ordenar sozinho pelo preço de loja. Antes era
  // o resto da marcação manual, e o que subia era o que você tivesse marcado —
  // o acervo tem PS5, Harley e patinete, e eles ficavam atrás de relógio de
  // R$ 53,60. O herói sai da lista pra não aparecer duas vezes.
  const semOHeroi = daSemana.filter((a) => a.id !== heroi?.id);
  const emDestaque = maisValiosos(semOHeroi, precoNaLoja, quantosDestaques(semOHeroi.length));
  const semana = leiloesDaSemana(daSemana, { jaEstaoEmCartaz: [...emDestaque, ...(heroi ? [heroi] : [])] });

  const buscar = (termo) => {
    navigate('/Loja-Virtual' + (termo ? `?search=${encodeURIComponent(termo)}` : ''));
  };

  // o selo "ao vivo" do topo usa a MESMA contagem da faixa — um número só
  const leiloesAgora = Number(String(numeros.find((n) => n.chave === 'leiloes')?.valor || '').replace(/\./g, '')) || 0;

  return (
    <div className="min-h-screen bg-nz-noite">
      <TopoHomeNova leiloesAgora={leiloesAgora} onBuscar={buscar} />
      <HeroDoDia leilao={heroi} />
      <ExplorePorCategoria categorias={categorias} />
      <FaixaDeNumeros itens={numeros} />
      <CarrosselDeLeiloes
        titulo="Em destaque"
        subtitulo="A seleção da casa, atualizada por nós."
        leiloes={emDestaque}
        precoNaLoja={precoNaLoja}
        rotuloDoBotao="Dar lance"
        teste="carrossel-destaque"
      />
      <CarrosselDeLeiloes
        titulo="Leilões da semana"
        subtitulo="Terminam nos próximos 7 dias — quem acaba primeiro na frente."
        leiloes={semana}
        precoNaLoja={precoNaLoja}
        rotuloDoBotao="Entrar no leilão"
        teste="carrossel-semana"
      />
      <BlocoParceiro />
      <SelosDeConfianca />
      <RodapeHomeNova />
    </div>
  );
}
