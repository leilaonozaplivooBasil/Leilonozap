import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ShoppingBag, TrendingUp, Users, Wallet, Megaphone, ArrowRight, CheckCircle2, UserPlus } from 'lucide-react';

// 🛒 SEJA UM VENDEDOR — página de vendas do cargo Vendedor.
// Regras do plano de carreira (career_levels, CONSOLIDADO — não alterar aqui, só exibir):
//   Influenciador 5% → Vendedor 10% → Licenciado 13% → Parceiro 15% → ... → Distribuidor 20%
// ⚠️ O vendedor NÃO se auto-cadastra: ele é cadastrado por um LICENCIADO (aba "Meus Vendedores"
// do Painel de Alavancagem). Por isso o CTA aqui é "falar com um licenciado", não "criar conta".
const ESCADA = [
  { cargo: 'Influenciador', pct: '5%', desc: 'Indica e ganha em cada venda e arremate', gratis: true },
  { cargo: 'Vendedor', pct: '10%', desc: 'Vende direto e ganha o dobro do influenciador', destaque: true },
  { cargo: 'Licenciado', pct: '13%', desc: 'Tem loja virtual própria e monta equipe' },
  { cargo: 'Parceiro', pct: '15%', desc: 'Investe e acompanha o rendimento' },
];

const BENEFICIOS = [
  { icon: Wallet, title: '10% em cada venda', desc: 'Comissão em dinheiro real (R$) sobre a venda direta — o dobro do influenciador.' },
  { icon: ShoppingBag, title: 'Catálogo pronto', desc: 'Milhares de produtos com preço de atacado. Você não precisa comprar estoque.' },
  { icon: Megaphone, title: 'Material de divulgação', desc: 'Link exclusivo, QR Code e artes prontas pra postar e vender.' },
  { icon: TrendingUp, title: 'Cresça na carreira', desc: 'Vendendo bem, você evolui para Licenciado e ganha ainda mais.' },
];

export default function SejaVendedor() {
  const navigate = useNavigate();
  const whats = `https://wa.me/5521984072064?text=${encodeURIComponent('Olá! Quero ser VENDEDOR do Leilão NoZap. Como faço?')}`;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* HERO */}
      <section className="px-4 py-14 text-center" style={{ background: 'radial-gradient(900px 400px at 50% -10%, rgba(16,90,55,.5), transparent), #0b1a12' }}>
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold" style={{ background: 'rgba(52,211,153,.14)', border: '1px solid rgba(52,211,153,.35)', color: '#6ee7b7' }}>
            <ShoppingBag className="w-4 h-4" /> Programa de Vendedores
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-black leading-tight">
            Seja um <span className="text-green-400">Vendedor</span> e ganhe <span className="text-yellow-400">10%</span> em cada venda
          </h1>
          <p className="mt-4 text-gray-300 text-lg">
            Sem comprar estoque, sem investir nada. Você vende os produtos do nosso catálogo e recebe
            <strong className="text-green-400"> 10% em dinheiro real</strong> sobre cada venda que fizer.
          </p>

          <div className="mt-8 inline-block rounded-2xl p-5 bg-gray-800/70 border border-gray-700 text-left max-w-md">
            <p className="flex items-center gap-2 text-sm font-bold text-yellow-300">
              <UserPlus className="w-4 h-4" /> Como entrar
            </p>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
              O cadastro de vendedor é feito por um <strong className="text-white">Licenciado</strong> — ele te cadastra
              e te acompanha. Já conhece um licenciado? Fale com ele. Se não, a gente te apresenta:
            </p>
            <a href={whats} target="_blank" rel="noreferrer" className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}>
              Quero ser vendedor <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="px-4 py-14">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-8">Por que ser vendedor?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BENEFICIOS.map((b) => (
              <div key={b.title} className="rounded-2xl p-6 bg-gray-800/60 border border-gray-700">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(52,211,153,.14)', border: '1px solid rgba(52,211,153,.3)' }}>
                  <b.icon className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="font-bold text-lg">{b.title}</h3>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ESCADA DA CARREIRA */}
      <section className="px-4 py-14" style={{ background: '#0b1a12' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center">Onde o vendedor fica na carreira</h2>
          <p className="text-gray-400 text-center mt-2 mb-8">Quanto mais alto o cargo, maior a sua comissão na venda direta.</p>

          <div className="space-y-3">
            {ESCADA.map((n, i) => (
              <div
                key={n.cargo}
                className={`flex items-center gap-4 rounded-2xl p-4 border ${n.destaque ? 'border-green-500 bg-green-500/10' : 'border-gray-700 bg-gray-800/50'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${n.destaque ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-300'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold ${n.destaque ? 'text-green-300' : 'text-white'}`}>
                    {n.cargo} {n.destaque && <span className="text-[11px] font-black bg-green-500 text-black px-2 py-0.5 rounded ml-1">VOCÊ AQUI</span>}
                    {n.gratis && <span className="text-[11px] text-gray-400 ml-2">grátis</span>}
                  </p>
                  <p className="text-sm text-gray-400">{n.desc}</p>
                </div>
                <div className={`text-2xl font-black shrink-0 ${n.destaque ? 'text-yellow-400' : 'text-gray-400'}`}>{n.pct}</div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-500 mt-5">
            A escada continua: Ponto de Retirada 16% · Loja Física 19% · Distribuidor 20%.
          </p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-8">Como funciona na prática</h2>
          <div className="space-y-3">
            {[
              'Um Licenciado cadastra você como vendedor e te entrega o seu link exclusivo.',
              'Você divulga os produtos com o seu link (WhatsApp, redes, QR Code).',
              'O cliente compra pelo seu link e nós entregamos — você não toca em estoque.',
              'Sua comissão de 10% cai na sua carteira. Você saca quando quiser.',
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl p-4 bg-gray-800/50 border border-gray-700">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <p className="text-gray-200 text-sm">{t}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a href={whats} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-white text-lg" style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', boxShadow: '0 8px 28px rgba(34,197,94,.35)' }}>
              <Users className="w-5 h-5" /> Quero ser vendedor
            </a>
            <p className="text-gray-500 text-sm mt-4">
              É Licenciado e quer cadastrar seus vendedores?{' '}
              <button onClick={() => navigate(createPageUrl('Licensing'))} className="text-green-400 font-semibold hover:underline">
                Acesse o Painel de Alavancagem
              </button>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
