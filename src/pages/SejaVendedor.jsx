import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ShoppingBag, TrendingUp, Users, Wallet, Megaphone, ArrowRight, CheckCircle2, Store, Truck, UserCheck } from 'lucide-react';
import SellerEarningsCalculator from '@/components/seller/SellerEarningsCalculator';

// 🛒 SEJA UM VENDEDOR — página de vendas do cargo Vendedor.
// Percentuais de VENDA DIRETA da ÁRVORE OFICIAL (src/lib/careerLevels.js — fonte única,
// validada 22/07/2026 — não alterar aqui, só exibir):
//   Influenciador 5% · Vendedor 10% · Licenciado 13% · Parceiro 15% (venda direta de cada cargo)
// ⚠️ O vendedor NÃO se auto-cadastra: ele é cadastrado por um LICENCIADO (aba "Meus Vendedores"
// do Painel de Alavancagem). Por isso o CTA aqui é "falar com um licenciado", não "criar conta".
const ESCADA = [
  { cargo: 'Influenciador', pct: '5%', desc: 'Indica e ganha em cada venda e arremate', gratis: true },
  { cargo: 'Vendedor', pct: '10%', desc: 'Vende direto pelo catálogo, sem comprar estoque', destaque: true },
  { cargo: 'Licenciado', pct: '13%', desc: 'Tem loja virtual própria e monta equipe — ganha em toda venda da sua rede' },
  { cargo: 'Parceiro', pct: '15%', desc: 'Investe e ganha sobre toda a estrutura abaixo dele' },
];

const BENEFICIOS = [
  { icon: Wallet, title: '10% em cada venda', desc: 'Comissão em dinheiro real (R$) sobre toda venda pessoal que você fizer.' },
  { icon: Users, title: '5% com influenciadores', desc: 'Cadastre influenciadores e ganhe 5% em cada venda que eles fizerem — sem limite de ganhos.' },
  { icon: ShoppingBag, title: 'Loja virtual pronta', desc: 'Diversos produtos, com preços variados, sempre abaixo do mercado.' },
  { icon: Megaphone, title: 'Material de divulgação exclusivo', desc: 'Link, QR Code e artes prontas pra postar e vender.' },
  { icon: UserCheck, title: 'Suporte de um executivo de contas', desc: 'Alguém da nossa equipe te acompanha e te ajuda a vender mais.' },
  { icon: TrendingUp, title: 'Cresça na carreira', desc: 'Vendendo bem, você evolui para Licenciado e ganha ainda mais.' },
];

export default function SejaVendedor() {
  const navigate = useNavigate();
  const whats = `https://wa.me/5521984072064?text=${encodeURIComponent('Olá! Quero ser VENDEDOR do Leilão NoZap. Como faço?')}`;

  return (
    <div className="min-h-screen bg-white text-nz-tinta">
      {/* HERO */}
      <section className="px-4 py-14 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border border-nz-verde/30 bg-nz-verde-fundo text-nz-verde">
            <ShoppingBag className="w-4 h-4" /> Programa de Vendedores
          </span>
          <h1 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-black leading-tight text-nz-tinta">
            Seja um <span className="text-nz-verde">Vendedor</span> e ganhe <span className="text-yellow-500">10%</span> em cada venda
          </h1>
          <p className="mt-4 text-nz-tinta-fraca text-base sm:text-lg">
            Você ganha <strong className="text-nz-verde">10% em cada venda pessoal</strong> e ainda mais{' '}
            <strong className="text-nz-verde">5% em cada venda dos influenciadores</strong> que você cadastrar —
            sem limite de ganhos.
          </p>
        </div>

        {/* 🎬 Vídeo — vendedor real, celular na mão, conversando com clientes */}
        <div className="max-w-3xl mx-auto mt-8 rounded-2xl overflow-hidden border-2 border-nz-verde/30 shadow-xl relative">
          <video
            src="https://media.base44.com/videos/public/68d536db3c26ff51f79c4137/1e5cd0bf9_Vdeo_Vendedor.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-64 sm:h-80 md:h-96 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent flex flex-col items-center justify-end pb-6 px-4 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Seja um Vendedor Leilão NoZap</h2>
            <p className="text-gray-100 text-sm sm:text-base mt-1 drop-shadow-lg">Divulgue, venda e ganhe 10% em dinheiro real</p>
          </div>
        </div>

        <div className="max-w-md mx-auto mt-8 rounded-2xl p-5 bg-nz-verde-fundo border border-nz-verde/30 text-left">
          <p className="text-sm text-nz-tinta-fraca leading-relaxed">
            Você se cadastra, faz a sua <strong className="text-nz-tinta">primeira compra</strong> e nós te indicamos
            um executivo da sua região para te dar suporte — você também será conectado a um licenciado local.
          </p>
          <a href={whats} target="_blank" rel="noreferrer" className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white bg-nz-verde hover:bg-nz-verde/90 transition-colors">
            Quero ser vendedor <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="px-4 py-14">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-8 text-nz-tinta">Por que ser vendedor?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFICIOS.map((b) => (
              <div key={b.title} className="rounded-2xl p-6 bg-white border border-nz-borda">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 bg-nz-verde-fundo border border-nz-verde/30">
                  <b.icon className="w-5 h-5 text-nz-verde" />
                </div>
                <h3 className="font-bold text-lg text-nz-tinta">{b.title}</h3>
                <p className="text-nz-tinta-fraca text-sm mt-1 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALCULADORA */}
      <section className="px-4 py-14 bg-nz-cinza-fundo">
        <SellerEarningsCalculator />
      </section>

      {/* KIT INICIAL */}
      <section className="px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-3 text-nz-tinta">Como começar</h2>
          <p className="text-nz-tinta-fraca text-center mb-8">
            Você paga <strong className="text-nz-tinta">R$ 1.497</strong> pelo Mercado Pago e escolhe os produtos da
            sua <strong className="text-nz-tinta">primeira compra</strong> direto na nossa Loja Virtual.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="rounded-2xl p-5 border border-nz-borda bg-white flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-nz-verde-fundo border border-nz-verde/30">
                <Truck className="w-5 h-5 text-nz-verde" />
              </div>
              <div>
                <p className="font-bold text-nz-tinta">Receba em casa</p>
                <p className="text-sm text-nz-tinta-fraca mt-1">Sua primeira compra chega direto no seu endereço.</p>
              </div>
            </div>
            <div className="rounded-2xl p-5 border border-nz-borda bg-white flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-nz-verde-fundo border border-nz-verde/30">
                <Store className="w-5 h-5 text-nz-verde" />
              </div>
              <div>
                <p className="font-bold text-nz-tinta">Retire na loja</p>
                <p className="text-sm text-nz-tinta-fraca mt-1">Prefere buscar? Retire pessoalmente.</p>
              </div>
            </div>
            <div className="rounded-2xl p-5 border border-nz-borda bg-white flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-nz-verde-fundo border border-nz-verde/30">
                <Wallet className="w-5 h-5 text-nz-verde" />
              </div>
              <div>
                <p className="font-bold text-nz-tinta">Já pode vender online</p>
                <p className="text-sm text-nz-tinta-fraca mt-1">Assim que o pagamento é feito, seu pedido já é enviado — e você já pode divulgar e vender pela sua Loja Virtual.</p>
              </div>
            </div>
            <div className="rounded-2xl p-5 border border-nz-borda bg-white flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-nz-verde-fundo border border-nz-verde/30">
                <ShoppingBag className="w-5 h-5 text-nz-verde" />
              </div>
              <div>
                <p className="font-bold text-nz-tinta">Loja virtual com diversos produtos</p>
                <p className="text-sm text-nz-tinta-fraca mt-1">Sua loja já vem pronta, com produtos variados enviando para todo o Brasil — e você ganha 10% imediatamente em cada venda.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6 border border-nz-verde/30 bg-nz-verde-fundo text-center">
            <p className="text-sm text-nz-tinta-fraca">
              Quando os produtos chegarem, é só despachar para os seus clientes e recuperar o valor investido.
              A partir da primeira venda, você já ganha <strong className="text-nz-verde">10% em dinheiro real</strong>,
              direto na sua carteira.
            </p>
            <button onClick={() => navigate(createPageUrl('Catalog'))} className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-nz-verde border-2 border-nz-verde/40 hover:bg-white transition-colors">
              <ShoppingBag className="w-4 h-4" /> Pagar agora e escolher meus produtos
            </button>
          </div>
        </div>
      </section>

      {/* ESCADA DA CARREIRA */}
      <section className="px-4 py-14 bg-nz-cinza-fundo">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center text-nz-tinta">Onde o vendedor fica na carreira</h2>
          <p className="text-nz-tinta-fraca text-center mt-2 mb-8">Cada cargo tem a sua fatia em toda venda da sua rede — subindo de cargo, você ganha na estrutura inteira, não só na venda direta.</p>

          <div className="space-y-3">
            {ESCADA.map((n, i) => (
              <div
                key={n.cargo}
                className={`flex items-center gap-4 rounded-2xl p-4 border ${n.destaque ? 'border-nz-verde bg-nz-verde-fundo' : 'border-nz-borda bg-white'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${n.destaque ? 'bg-nz-verde text-white' : 'bg-gray-200 text-nz-tinta-fraca'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold ${n.destaque ? 'text-nz-verde' : 'text-nz-tinta'}`}>
                    {n.cargo} {n.destaque && <span className="text-[11px] font-black bg-nz-verde text-white px-2 py-0.5 rounded ml-1">VOCÊ AQUI</span>}
                    {n.gratis && <span className="text-[11px] text-nz-tinta-fraca ml-2">grátis</span>}
                  </p>
                  <p className="text-sm text-nz-tinta-fraca">{n.desc}</p>
                </div>
                <div className={`text-2xl font-black shrink-0 ${n.destaque ? 'text-yellow-500' : 'text-nz-tinta-fraca'}`}>{n.pct}</div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-nz-tinta-fraca mt-5">
            A escada continua: Ponto de Retirada 1% · Loja Física 3% · Distribuidor 1% — a rede toda divide 30% de cada venda.
          </p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-8 text-nz-tinta">Como funciona na prática</h2>
          <div className="space-y-3">
            {[
              'Você se cadastra e paga R$ 1.497 pelo Mercado Pago (PIX ou cartão).',
              'Escolhe os produtos da sua primeira compra na Loja Virtual e recebe em casa ou retira na loja.',
              'Já começa a vender na sua Loja Virtual — e ganha 10% em dinheiro real imediatamente, em cada venda.',
              'Vendendo os produtos que você recebeu, você recupera o valor investido.',
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl p-4 bg-white border border-nz-borda">
                <CheckCircle2 className="w-5 h-5 text-nz-verde shrink-0 mt-0.5" />
                <p className="text-nz-tinta text-sm">{t}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a href={whats} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-white text-lg bg-nz-verde hover:bg-nz-verde/90 transition-colors shadow-lg">
              <Users className="w-5 h-5" /> Quero ser vendedor
            </a>
            <p className="text-nz-tinta-fraca text-sm mt-4">
              É Licenciado e quer cadastrar seus vendedores?{' '}
              <button onClick={() => navigate(createPageUrl('Licensing'))} className="text-nz-verde font-semibold hover:underline">
                Acesse o Painel de Alavancagem
              </button>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}