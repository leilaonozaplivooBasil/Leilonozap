import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useTotalProdutosLoja from '@/hooks/useTotalProdutosLoja';
import TourLojaGuia from './TourLojaGuia';
import TourLojaVitrine from './TourLojaVitrine';
import TourLojaProduto from './TourLojaProduto';

// 🛣️ TOUR DA LOJA VIRTUAL — o parceiro percorre o canal próprio SEM sair da
// página do Parceiro. Camada de tela cheia, navegação real (categorias, rolar,
// carregar mais, abrir item, voltar) e SOMENTE LEITURA.
// ⚠️ PROIBIDO aqui: preço, R$, percentual, frete, comprar, carrinho, lance,
// dono da loja, WhatsApp e link de indicação.
const PAGINA = 12;

export default function ParceiroTourLoja({ onClose }) {
  const total = useTotalProdutosLoja();
  const rolagemRef = useRef(null);
  const posicaoSalva = useRef(0);

  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('all');
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [fim, setFim] = useState(false);
  const [erro, setErro] = useState(false);
  const [itemAberto, setItemAberto] = useState(null);

  // Esc fecha + trava o rolamento do fundo enquanto o tour está aberto
  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === 'Escape') onClose(); };
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [onClose]);

  // Categorias reais e ativas do catálogo
  useEffect(() => {
    let ativo = true;
    base44.entities.Category.filter({ parent_category_id: null, is_active: true })
      .then((lista) => {
        if (ativo) setCategorias((lista || []).filter((c) => c?.id && c?.name));
      })
      .catch(() => { if (ativo) setCategorias([]); });
    return () => { ativo = false; };
  }, []);

  const buscar = useCallback((cat, deslocamento) => {
    const filtro = { catalog_active: true };
    if (cat !== 'all') filtro.category_id = cat;
    return base44.entities.Product
      .filter(filtro, '-created_date', PAGINA, deslocamento)
      .then((lista) => (lista || []).filter((p) => p?.id && p?.image_urls?.[0]));
  }, []);

  // Primeira carga e troca de categoria
  const carregarInicio = useCallback((cat) => {
    setCarregando(true);
    setErro(false);
    setFim(false);
    buscar(cat, 0)
      .then((lista) => {
        setItens(lista);
        if (lista.length < PAGINA) setFim(true);
      })
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, [buscar]);

  useEffect(() => { carregarInicio(categoria); }, [categoria, carregarInicio]);

  const carregarMais = () => {
    if (carregandoMais || fim) return;
    setCarregandoMais(true);
    buscar(categoria, itens.length)
      .then((lista) => {
        if (!lista.length) { setFim(true); return; }
        setItens((antes) => {
          const vistos = new Set(antes.map((i) => i.id));
          return [...antes, ...lista.filter((i) => !vistos.has(i.id))];
        });
        if (lista.length < PAGINA) setFim(true);
      })
      .catch(() => setFim(true))
      .finally(() => setCarregandoMais(false));
  };

  // Abrir item guarda a posição do rolamento; voltar restaura tudo intacto
  const abrirItem = (item) => {
    posicaoSalva.current = rolagemRef.current?.scrollTop || 0;
    setItemAberto(item);
    if (rolagemRef.current) rolagemRef.current.scrollTop = 0;
  };

  const voltarVitrine = () => {
    setItemAberto(null);
    requestAnimationFrame(() => {
      if (rolagemRef.current) rolagemRef.current.scrollTop = posicaoSalva.current;
    });
  };

  const nomeCategoria = categorias.find((c) => c.id === categoria)?.name;
  const etapa = itemAberto ? 2 : categoria !== 'all' ? 1 : 0;
  const legenda = itemAberto
    ? 'Ficha operacional do item, como o consumidor final vê.'
    : categoria !== 'all'
      ? `Curadoria da categoria ${nomeCategoria || 'selecionada'}.`
      : 'Itens ativos no canal próprio, organizados por categoria.';

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col bg-pc-preto/95 p-0 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Percurso pela Loja Virtual"
    >
      <div
        className="mx-auto flex h-full w-full max-w-6xl flex-col border border-pc-ouro/40 bg-pc-preto-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho fixo */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-pc-borda p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-pc-ouro">
              Loja Virtual · Percurso demonstrativo
            </p>
            <h2 className="mt-1.5 truncate text-lg font-bold text-pc-tinta sm:text-2xl">
              Canal próprio de venda
            </h2>
            {total > 0 && (
              <p className="mt-1 text-xs text-pc-tinta-fraca">
                {total.toLocaleString('pt-BR')} itens ativos no catálogo
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar percurso"
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-pc-borda text-pc-tinta-fraca transition-colors hover:border-pc-ouro hover:text-pc-ouro"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0">
          <TourLojaGuia etapa={etapa} legenda={legenda} />
        </div>

        {/* Área rolável do percurso */}
        <div ref={rolagemRef} className="min-h-0 flex-1 overflow-y-auto">
          {itemAberto ? (
            <TourLojaProduto
              item={itemAberto}
              nomeCategoria={nomeCategoria}
              onVoltar={voltarVitrine}
            />
          ) : (
            <TourLojaVitrine
              categorias={categorias}
              categoriaAtual={categoria}
              onTrocarCategoria={setCategoria}
              itens={itens}
              carregando={carregando}
              carregandoMais={carregandoMais}
              fim={fim}
              erro={erro}
              onCarregarMais={carregarMais}
              onAbrirItem={abrirItem}
              onTentarNovamente={() => carregarInicio(categoria)}
            />
          )}
        </div>

        {/* Rodapé fixo permanente */}
        <p className="shrink-0 border-t border-pc-borda px-4 py-3 text-[10px] leading-relaxed text-pc-tinta-fraca sm:px-6 sm:text-xs">
          Percurso demonstrativo — sem valores, sem compra. Condições comerciais
          tratadas somente após cadastro e termo de confidencialidade.
        </p>
      </div>
    </div>
  );
}