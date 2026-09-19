import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Mail, MapPin, MessageCircle } from 'lucide-react';
import { EMAIL_CONTATO, ENDERECO_SEDE, RAZAO_SOCIAL, CNPJ } from '@/lib/contatoOficial';
import { WHATSAPP_OFICIAL_FORMATADO, linkWhatsAppOficial } from '@/lib/whatsappOficial';
import { LOGO_FALLBACK } from '@/hooks/useSiteMedia';

// 🦶 RODAPÉ da home nova.
//
// 🔴 CONTATO NUNCA É DIGITADO AQUI. Telefone, e-mail, endereço, razão social e
// CNPJ vêm de `lib/contatoOficial.js` e `lib/whatsappOficial.js`, a fonte única
// desde a auditoria de 15/09. Foi um número de exemplo escrito na mão que fez o
// carrinho abrir conversa com "(21) 99999-9999" na cara do cliente.
//
// 🔴 SÓ ENTRA LINK COM PÁGINA. Os itens do mock que ainda não têm página estão
// em PENDENTES: link morto no rodapé derruba confiança e indexação. Cada um
// entra quando a página nascer.
export const RODAPE_PENDENTE = [
  'Quem Somos', 'Contato', 'Central de ajuda', 'Fale conosco',
  'Perguntas frequentes', 'Segurança', 'Depoimentos',
];

const COLUNAS = [
  {
    titulo: 'Institucional',
    itens: [
      { rotulo: 'Início', para: '/' },
      { rotulo: 'Como funciona', para: '/ComoFunciona' },
      { rotulo: 'Leilões', para: '/leiloes' },
      { rotulo: 'Loja Virtual', para: '/Loja-Virtual' },
      { rotulo: 'Seja um parceiro', para: '/Lucre' },
    ],
  },
  {
    titulo: 'Comprar',
    itens: [
      { rotulo: 'Leilões ativos', para: '/leiloes' },
      { rotulo: 'Direto de Fábrica', para: '/DiretoDeFabrica' },
      { rotulo: 'Leilão ao vivo', para: '/LiveShopNoZap' },
      { rotulo: 'Meu carrinho', para: '/Cart' },
    ],
  },
  {
    titulo: 'Suporte',
    itens: [
      { rotulo: 'Rastrear pedido', para: '/OrderTracking' },
      { rotulo: 'Termos de uso', para: '/terms' },
      { rotulo: 'Política de privacidade', para: '/privacy' },
    ],
  },
];

/** O contato é um cartão, não uma linha de texto: é o que o cliente procura quando já decidiu falar. */
const CONTATOS = [
  { id: 'whatsapp', icone: MessageCircle, rotulo: 'WhatsApp', teste: 'rodape-whatsapp' },
  { id: 'email', icone: Mail, rotulo: 'E-mail', teste: 'rodape-email' },
  { id: 'endereco', icone: MapPin, rotulo: 'Onde estamos', teste: 'rodape-endereco' },
];

const CARTAO_CONTATO = 'group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-nz-verde-claro/45 hover:bg-white/[0.06] hover:shadow-[0_16px_34px_-20px_rgba(46,157,99,0.6)] motion-reduce:transition-none motion-reduce:hover:translate-y-0';
const MOLDURA_ICONE = 'flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-nz-verde-claro/25 bg-nz-verde-claro/10 transition-colors duration-300 group-hover:border-nz-verde-neon/60 group-hover:bg-nz-verde-claro/20';

export default function RodapeHomeNova() {
  const ano = new Date().getFullYear();

  // ⬆️ A home tem mais de 3.500px. Sem isto, quem chega no rodapé rola tudo de
  // volta na mão — e a pessoa que leu até aqui é justamente a mais interessada.
  const subir = () => {
    const querParado = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: querParado ? 'auto' : 'smooth' });
  };

  const conteudo = {
    whatsapp: WHATSAPP_OFICIAL_FORMATADO,
    email: EMAIL_CONTATO,
    endereco: ENDERECO_SEDE,
  };
  const destino = {
    whatsapp: { href: linkWhatsAppOficial(), target: '_blank', rel: 'noopener noreferrer' },
    email: { href: `mailto:${EMAIL_CONTATO}` },
    endereco: null,
  };

  return (
    <footer className="relative overflow-hidden bg-nz-noite-2 px-5 pb-8 pt-[clamp(40px,6vw,72px)] text-white/70" data-teste="rodape-home-nova">
      {/* luz da marca subindo do pé da página: fecha a home com a mesma cor que abriu */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
        style={{ background: 'radial-gradient(70% 100% at 50% 100%, rgba(46,157,99,0.14) 0%, transparent 72%)' }}
      />

      <div className="relative mx-auto max-w-[1200px]">
        <div className="grid gap-9 md:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <img src={LOGO_FALLBACK} alt="Leilão NoZap" className="h-10 w-auto" />
            <p className="mt-4 max-w-[30ch] text-[14px] leading-[1.5] text-white/55">
              Grandes oportunidades mais perto de você.
            </p>
          </div>

          {COLUNAS.map((col) => (
            <div key={col.titulo}>
              <div className="font-slab text-[13px] font-extrabold uppercase tracking-[0.14em] text-white">{col.titulo}</div>
              <ul className="mt-4 space-y-2.5">
                {col.itens.map((i) => (
                  <li key={i.rotulo}>
                    {/* o link anda um passo para a direita: diz "é clicável" sem
                        depender só da cor, que some para quem não distingue verde */}
                    <Link
                      to={i.para}
                      className="inline-block text-[14px] text-white/55 transition-all duration-200 hover:translate-x-1 hover:text-nz-verde-neon motion-reduce:transition-none motion-reduce:hover:translate-x-0"
                    >
                      {i.rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-3">
          {CONTATOS.map((c) => {
            const dentro = (
              <>
                <span className={MOLDURA_ICONE}>
                  <c.icone size={17} className="text-nz-verde-neon" />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">{c.rotulo}</div>
                  <div
                    className="mt-1 text-[14px] leading-snug text-white/75 transition-colors duration-200 group-hover:text-nz-verde-neon"
                    data-teste={c.teste}
                  >
                    {conteudo[c.id]}
                  </div>
                </div>
              </>
            );
            const alvo = destino[c.id];
            return alvo
              ? <a key={c.id} {...alvo} className={CARTAO_CONTATO}>{dentro}</a>
              : <div key={c.id} className={CARTAO_CONTATO}>{dentro}</div>;
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <p className="text-[12px] leading-relaxed text-white/40" data-teste="rodape-cnpj">
            © {ano} {RAZAO_SOCIAL} · CNPJ {CNPJ}
          </p>
          <button
            type="button"
            onClick={subir}
            className="group inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/15 px-4 text-[12px] font-semibold text-white/60 transition-all duration-200 hover:border-nz-verde-neon hover:text-nz-verde-neon motion-reduce:transition-none"
          >
            <ArrowUp size={14} className="transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transform-none" />
            Voltar ao topo
          </button>
        </div>
      </div>
    </footer>
  );
}
