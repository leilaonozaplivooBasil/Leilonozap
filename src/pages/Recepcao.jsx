import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from '@/utils';
import { Gavel, ShoppingBag, Flame, Truck, ShieldCheck, ArrowRight, Zap, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { HOME_SECTOR_CARDS } from '@/lib/sectors';

// cores por setor (o card carrega a identidade da vertical)
const ACCENT = {
  emerald: '#34d399', green: '#22c55e', red: '#ef4444',
  blue: '#60a5fa', orange: '#fb923c', amber: '#fbbf24',
};

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Recepcao() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ leiloes: 0, produtos: 0 });
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [{ count: lc }, { count: pc }] = await Promise.all([
          supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('catalog_active', true),
        ]);
        setStats({ leiloes: lc || 0, produtos: pc || 0 });
        const { data } = await supabase.from('products').select('id,description,price_catalog,image_urls,market_value').eq('catalog_active', true).order('is_featured', { ascending: false }).limit(8);
        setProdutos((data || []).filter((p) => p.image_urls && p.image_urls[0]));
      } catch (e) { /* silencioso */ }
    })();
  }, []);

  // carrossel EM DESTAQUE (estilo Sympla): autoplay com pausa no hover/toque
  const [featIdx, setFeatIdx] = useState(0);
  const featPaused = useRef(false);
  const touchX = useRef(null);
  useEffect(() => {
    if (produtos.length < 2) return;
    const t = setInterval(() => {
      if (!featPaused.current) setFeatIdx((i) => (i + 1) % produtos.length);
    }, 4500);
    return () => clearInterval(t);
  }, [produtos.length]);
  // offset circular do slide i em relação ao ativo → classe de posição
  const featPos = (i) => {
    const n = produtos.length;
    let d = ((i - featIdx) % n + n) % n;
    if (d > n / 2) d -= n;
    return Math.abs(d) <= 2 ? `feat-pos-${d}` : 'feat-pos-off';
  };

  const [q, setQ] = useState('');
  const goLeiloes = () => navigate(createPageUrl('leiloes'));
  const goLoja = () => navigate('/Loja-Virtual');
  // produto agora abre o PRODUTO (antes qualquer card jogava na lista genérica = atrito puro)
  const goProduto = (id) => navigate(createPageUrl('CatalogProductDetails') + `?id=${id}`);
  const buscar = (e) => {
    e.preventDefault();
    navigate('/Loja-Virtual' + (q.trim() ? `?search=${encodeURIComponent(q.trim())}` : ''));
  };

  return (
    <div className="recepcao">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Manrope:wght@400;600;700;800&display=swap');
        .recepcao { font-family: 'Manrope', sans-serif; background: #05100b; color: #e9f5ef; overflow-x: hidden; }
        .display { font-family: 'Anton', sans-serif; letter-spacing: .5px; line-height: .95; }
        .glow { position:absolute; border-radius:50%; filter: blur(90px); opacity:.5; pointer-events:none; }
        .grain:before{ content:''; position:absolute; inset:0; opacity:.05; pointer-events:none;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
        @keyframes ctaPulse { 0%{box-shadow:0 0 0 0 rgba(34,197,94,.55)} 70%{box-shadow:0 0 0 24px rgba(34,197,94,0)} 100%{box-shadow:0 0 0 0 rgba(34,197,94,0)} }
        .cta-pulse { animation: ctaPulse 2s infinite; }
        @keyframes floatUp { from{opacity:0; transform:translateY(24px)} to{opacity:1; transform:translateY(0)} }
        .rise { animation: floatUp .7s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes liveBlink { 0%,100%{opacity:1} 50%{opacity:.3} }
        .live-dot { animation: liveBlink 1.2s infinite; }
        .prod-card { transition: transform .25s, border-color .25s; }
        .prod-card:hover { transform: translateY(-6px); border-color: rgba(52,211,153,.6); }
        .shine { background: linear-gradient(110deg,#34d399 0%, #fbbf24 60%, #34d399 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }

        /* faixa de setores correndo sozinha (mesmo padrão das Ofertas Relâmpago) */
        @keyframes sectorMarquee { to { transform: translateX(-50%); } }
        .sector-viewport { position: relative; overflow: hidden; }
        .sector-marquee {
          display: flex; gap: 16px; width: max-content; padding: 4px 2px 8px;
          animation: sectorMarquee 48s linear infinite; will-change: transform;
        }
        .sector-viewport:hover .sector-marquee,
        .sector-viewport:active .sector-marquee { animation-play-state: paused; }
        .sector-card { flex: 0 0 auto; width: 252px; }
        @media (prefers-reduced-motion: reduce) { .sector-marquee { animation: none; } }
        .sector-fade { position: absolute; top: 0; bottom: 0; width: 56px; pointer-events: none; }
        .sector-fade-l { left: 0; background: linear-gradient(90deg, #07140d, transparent); }
        .sector-fade-r { right: 0; background: linear-gradient(270deg, #07140d, transparent); }

        /* CARROSSEL EM DESTAQUE — card central grande, vizinhos espiando nas
           laterais (padrão Sympla). Posições viram classes pra responsividade
           ficar toda no CSS. */
        .feat-stage { position: relative; height: 460px; }
        .feat-slide {
          position: absolute; top: 50%; left: 50%; width: 380px; cursor: pointer;
          border-radius: 20px; overflow: hidden; background: #0b1a12;
          border: 1px solid rgba(255,255,255,.09);
          transition: transform .55s cubic-bezier(.25,.8,.25,1), opacity .55s, box-shadow .55s;
          will-change: transform;
        }
        .feat-slide .feat-img { position: relative; aspect-ratio: 1; background: #fff; }
        .feat-slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .feat-pos-0  { transform: translate(-50%,-50%) scale(1); z-index: 5; opacity: 1; box-shadow: 0 30px 70px rgba(0,0,0,.55); }
        .feat-pos-1  { transform: translate(calc(-50% + 310px),-50%) scale(.78); z-index: 4; opacity: .55; }
        .feat-pos--1 { transform: translate(calc(-50% - 310px),-50%) scale(.78); z-index: 4; opacity: .55; }
        .feat-pos-2  { transform: translate(calc(-50% + 560px),-50%) scale(.6); z-index: 3; opacity: .3; }
        .feat-pos--2 { transform: translate(calc(-50% - 560px),-50%) scale(.6); z-index: 3; opacity: .3; }
        .feat-pos-off { transform: translate(-50%,-50%) scale(.5); z-index: 1; opacity: 0; pointer-events: none; }
        .feat-arrow {
          position: absolute; top: 50%; transform: translateY(-50%); z-index: 8;
          width: 48px; height: 48px; border-radius: 50%; border: none; cursor: pointer;
          background: #fff; color: #0b1a12; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(0,0,0,.45); transition: transform .2s;
        }
        .feat-arrow:hover { transform: translateY(-50%) scale(1.1); }
        .feat-arrow-l { left: max(12px, calc(50% - 420px)); }
        .feat-arrow-r { right: max(12px, calc(50% - 420px)); }
        .feat-dots { display: flex; gap: 8px; justify-content: center; margin-top: 20px; }
        .feat-dot { width: 8px; height: 8px; border-radius: 99px; border: none; cursor: pointer; padding: 0; background: rgba(255,255,255,.22); transition: all .3s; }
        .feat-dot.on { width: 22px; background: #34d399; }
        .feat-caption { text-align: center; margin-top: 18px; min-height: 74px; }
        @media (max-width: 900px) {
          .feat-stage { height: 380px; }
          .feat-slide { width: 300px; }
          .feat-pos-1  { transform: translate(calc(-50% + 235px),-50%) scale(.74); }
          .feat-pos--1 { transform: translate(calc(-50% - 235px),-50%) scale(.74); }
          .feat-pos-2, .feat-pos--2 { opacity: 0; pointer-events: none; }
          .feat-pos-2  { transform: translate(calc(-50% + 420px),-50%) scale(.55); }
          .feat-pos--2 { transform: translate(calc(-50% - 420px),-50%) scale(.55); }
        }
        @media (max-width: 560px) {
          .feat-stage { height: 330px; }
          .feat-slide { width: 240px; }
          .feat-pos-1  { transform: translate(calc(-50% + 165px),-50%) scale(.7); }
          .feat-pos--1 { transform: translate(calc(-50% - 165px),-50%) scale(.7); }
          .feat-arrow { width: 40px; height: 40px; }
          .feat-arrow-l { left: 6px; }
          .feat-arrow-r { right: 6px; }
        }
        @media (prefers-reduced-motion: reduce) { .feat-slide { transition: none; } }
      `}</style>

      {/* HERO */}
      <section className="grain" style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'radial-gradient(1200px 600px at 50% -10%, rgba(16,90,55,.45), transparent), radial-gradient(800px 500px at 90% 100%, rgba(180,140,20,.18), transparent), #05100b' }}>
        <div className="glow" style={{ width: 420, height: 420, background: '#10b981', top: '-80px', left: '-60px' }} />
        <div className="glow" style={{ width: 360, height: 360, background: '#f59e0b', bottom: '-120px', right: '-40px', opacity: .25 }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 920 }}>
          <div className="rise" style={{ animationDelay: '.05s', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 99, background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.35)', marginBottom: 26 }}>
            <span className="live-dot" style={{ width: 9, height: 9, borderRadius: 99, background: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />
            <span style={{ fontWeight: 800, fontSize: 13, color: '#fca5a5', letterSpacing: .5 }}>{stats.leiloes > 0 ? `${stats.leiloes} LEILÕES ACONTECENDO AGORA` : 'LEILÕES AO VIVO'}</span>
          </div>

          <h1 className="display rise" style={{ animationDelay: '.1s', fontSize: 'clamp(46px, 9vw, 104px)', margin: 0 }}>
            ARREMATE POR UMA<br /><span className="shine">FRAÇÃO DO PREÇO</span>
          </h1>

          <p className="rise" style={{ animationDelay: '.2s', fontSize: 'clamp(16px,2.4vw,21px)', color: '#9fb3aa', maxWidth: 620, margin: '22px auto 0', lineHeight: 1.5 }}>
            Leilões ao vivo + loja virtual com <strong style={{ color: '#fbbf24' }}>até 60% de desconto</strong>. Dê o seu lance, arremate e receba em casa.
          </p>

          {/* CTAs */}
          <div className="rise" style={{ animationDelay: '.3s', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 40 }}>
            <button onClick={goLeiloes} className="cta-pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '20px 38px', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', fontSize: 19, fontWeight: 800, fontFamily: 'Manrope' }}>
              <Gavel size={24} /> ENTRAR NOS LEILÕES <ArrowRight size={20} />
            </button>
            <button onClick={goLoja} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '20px 32px', borderRadius: 16, cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.18)', color: '#e9f5ef', fontSize: 18, fontWeight: 700, fontFamily: 'Manrope' }}>
              <ShoppingBag size={22} /> Ver a Loja Virtual
            </button>
          </div>

          {/* BUSCA — gesto nº 1 de quem chega em loja (antes não existia na abertura) */}
          <form onSubmit={buscar} className="rise" style={{ animationDelay: '.35s', marginTop: 28, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: '#6b8a7c' }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="O que você está procurando?"
                aria-label="Buscar produtos"
                style={{ width: '100%', padding: '17px 120px 17px 50px', borderRadius: 14, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.16)', color: '#e9f5ef', fontSize: 16, fontFamily: 'Manrope', outline: 'none' }}
              />
              <button type="submit" style={{ position: 'absolute', right: 6, top: 6, bottom: 6, padding: '0 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', fontWeight: 800, fontFamily: 'Manrope' }}>
                Buscar
              </button>
            </div>
          </form>

          {/* stats */}
          <div className="rise" style={{ animationDelay: '.4s', display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap', marginTop: 44 }}>
            {[[<Flame size={18} key="f" />, `${stats.leiloes}`, 'leilões ativos'], [<ShoppingBag size={18} key="s" />, `${stats.produtos}+`, 'produtos na loja'], [<Truck size={18} key="t" />, 'Brasil', 'entrega em todo o país'], [<ShieldCheck size={18} key="sh" />, 'PIX & Cartão', 'pagamento seguro']].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#9fb3aa' }}>
                <span style={{ color: '#34d399' }}>{s[0]}</span>
                <span><strong style={{ color: '#fff' }}>{s[1]}</strong> <span style={{ fontSize: 13 }}>{s[2]}</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SETORES — cada vertical do negócio com porta própria (antes ficavam escondidas) */}
      <section style={{ padding: '56px 20px', background: '#07140d' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 className="display" style={{ fontSize: 'clamp(24px,4vw,38px)', margin: '0 0 8px', textAlign: 'center' }}>
            POR ONDE VOCÊ QUER <span className="shine">COMEÇAR?</span>
          </h2>
          <p style={{ color: '#9fb3aa', textAlign: 'center', margin: '0 0 30px' }}>Escolha o setor e vá direto ao ponto.</p>

          {/* MARQUEE — a faixa corre sozinha, igual às Ofertas Relâmpago da loja.
              Cards duplicados fazem translateX(-50%) fechar o loop sem emenda.
              Pausa no hover (desktop) e ao tocar (mobile). */}
          <div className="sector-viewport">
            <div className="sector-marquee">
              {[...HOME_SECTOR_CARDS, ...HOME_SECTOR_CARDS].map((s, i) => {
                const c = ACCENT[s.accent] || '#34d399';
                return (
                  <button
                    key={`${s.title}-${i}`}
                    onClick={() => (s.external ? window.open(s.external, '_blank', 'noopener') : navigate(createPageUrl(s.page)))}
                    className="prod-card sector-card"
                    style={{
                      textAlign: 'left', cursor: 'pointer', padding: 22, borderRadius: 18,
                      background: '#0b1a12', border: '1px solid rgba(255,255,255,.08)',
                      color: '#e9f5ef', fontFamily: 'Manrope', display: 'flex', flexDirection: 'column', gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 56, height: 56, borderRadius: 14, marginBottom: 4,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: `${c}14`, border: `1px solid ${c}33`,
                      }}
                    >
                      <img
                        src={s.icon3d}
                        alt=""
                        aria-hidden
                        style={{ width: 40, height: 40, objectFit: 'contain' }}
                        loading="lazy"
                      />
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: c }}>{s.title}</span>
                    <span style={{ fontSize: 13.5, color: '#9fb3aa', lineHeight: 1.45 }}>{s.desc}</span>
                    <span style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: c }}>
                      Acessar <ArrowRight size={14} />
                    </span>
                  </button>
                );
              })}
            </div>
            {/* fades nas bordas */}
            <div className="sector-fade sector-fade-l" aria-hidden />
            <div className="sector-fade sector-fade-r" aria-hidden />
          </div>
        </div>
      </section>

      {/* VITRINE */}
      {produtos.length > 0 && (
        <section style={{ padding: '60px 20px', background: 'linear-gradient(#05100b, #07140d)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
              <h2 className="display" style={{ fontSize: 'clamp(26px,4vw,40px)', margin: 0 }}>EM DESTAQUE <span className="shine">AGORA</span></h2>
              <button onClick={goLoja} style={{ background: 'none', border: 'none', color: '#34d399', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>Ver tudo <ArrowRight size={16} /></button>
            </div>
            {/* CARROSSEL estilo Sympla: clicar no central abre o produto,
                clicar num lateral traz ele pro centro */}
            <div
              className="feat-stage"
              onMouseEnter={() => { featPaused.current = true; }}
              onMouseLeave={() => { featPaused.current = false; }}
              onTouchStart={(e) => { featPaused.current = true; touchX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                featPaused.current = false;
                if (touchX.current == null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                touchX.current = null;
                if (Math.abs(dx) > 40) setFeatIdx((i) => (i + (dx < 0 ? 1 : -1) + produtos.length) % produtos.length);
              }}
            >
              {produtos.map((p, i) => {
                const off = p.market_value > p.price_catalog ? Math.round((1 - p.price_catalog / p.market_value) * 100) : 0;
                const pos = featPos(i);
                return (
                  <div
                    key={p.id}
                    className={`feat-slide ${pos}`}
                    onClick={() => (pos === 'feat-pos-0' ? goProduto(p.id) : setFeatIdx(i))}
                  >
                    <div className="feat-img">
                      <img src={p.image_urls[0]} alt={p.description} loading="lazy" />
                      {off > 0 && <span style={{ position: 'absolute', top: 10, left: 10, background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>-{off}%</span>}
                    </div>
                  </div>
                );
              })}
              {produtos.length > 1 && (
                <>
                  <button aria-label="Anterior" className="feat-arrow feat-arrow-l" onClick={() => setFeatIdx((i) => (i - 1 + produtos.length) % produtos.length)}>
                    <ChevronLeft size={24} />
                  </button>
                  <button aria-label="Próximo" className="feat-arrow feat-arrow-r" onClick={() => setFeatIdx((i) => (i + 1) % produtos.length)}>
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* dots + título/preço do produto ativo (como o Sympla mostra o evento embaixo) */}
            <div className="feat-dots">
              {produtos.map((_, i) => (
                <button key={i} aria-label={`Ir para o item ${i + 1}`} className={`feat-dot${i === featIdx ? ' on' : ''}`} onClick={() => setFeatIdx(i)} />
              ))}
            </div>
            {produtos[featIdx] && (
              <div className="feat-caption" onClick={() => goProduto(produtos[featIdx].id)} style={{ cursor: 'pointer' }}>
                <div className="display" style={{ fontSize: 'clamp(18px,3vw,26px)', color: '#e9f5ef', textTransform: 'uppercase' }}>{produtos[featIdx].description}</div>
                <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: '#34d399' }}>{money(produtos[featIdx].price_catalog)}</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* COMO FUNCIONA */}
      <section style={{ padding: '60px 20px', background: '#07140d' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 className="display" style={{ fontSize: 'clamp(26px,4vw,40px)', marginBottom: 36 }}>SIMPLES <span className="shine">ASSIM</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
            {[[<Zap key="1" />, '1. Entre nos leilões', 'Veja os leilões ao vivo e dê o seu lance — ou compre direto na loja.'], [<Gavel key="2" />, '2. Arremate', 'Ganhou o lance? O produto é seu por uma fração do preço.'], [<Truck key="3" />, '3. Receba em casa', 'Pague com PIX ou cartão e receba com entrega em todo o Brasil.']].map((c, i) => (
              <div key={i} style={{ background: '#0b1a12', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: 26 }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(52,211,153,.13)', border: '1px solid rgba(52,211,153,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', margin: '0 auto 16px' }}>{c[0]}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>{c[1]}</h3>
                <p style={{ color: '#9fb3aa', fontSize: 14, margin: 0, lineHeight: 1.5 }}>{c[2]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: '70px 20px', textAlign: 'center', background: 'radial-gradient(800px 400px at 50% 50%, rgba(16,90,55,.5), #05100b)' }}>
        <h2 className="display" style={{ fontSize: 'clamp(30px,6vw,64px)', margin: '0 0 10px' }}>BORA <span className="shine">ARREMATAR?</span></h2>
        <p style={{ color: '#9fb3aa', marginBottom: 28 }}>Tem leilão rolando agora. Não fica de fora.</p>
        <button onClick={goLeiloes} className="cta-pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '20px 44px', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: 'Manrope' }}>
          <Gavel size={24} /> ENTRAR NOS LEILÕES AGORA
        </button>
      </section>
    </div>
  );
}
