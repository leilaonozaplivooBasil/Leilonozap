import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, MessageCircle } from 'lucide-react';
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

export default function RodapeHomeNova() {
  const ano = new Date().getFullYear();

  return (
    <footer className="bg-[#07100C] px-5 pb-8 pt-[clamp(40px,6vw,72px)] text-white/70" data-teste="rodape-home-nova">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-9 md:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <img src={LOGO_FALLBACK} alt="Leilão NoZap" className="h-10 w-auto" />
            <p className="mt-4 max-w-[30ch] text-[14px] leading-[1.5] text-white/55">
              Grandes oportunidades mais perto de você.
            </p>
          </div>

          {COLUNAS.map((col) => (
            <div key={col.titulo}>
              <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">{col.titulo}</div>
              <ul className="mt-4 space-y-2.5">
                {col.itens.map((i) => (
                  <li key={i.rotulo}>
                    <Link to={i.para} className="text-[14px] text-white/60 transition-colors hover:text-nz-verde-claro">
                      {i.rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-3 border-t border-white/10 pt-8 text-[14px] sm:grid-cols-3">
          <a href={linkWhatsAppOficial()} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 text-white/60 transition-colors hover:text-nz-verde-claro">
            <MessageCircle size={16} className="mt-0.5 flex-none text-nz-verde-claro" />
            <span data-teste="rodape-whatsapp">{WHATSAPP_OFICIAL_FORMATADO}</span>
          </a>
          <a href={`mailto:${EMAIL_CONTATO}`} className="flex items-start gap-2.5 text-white/60 transition-colors hover:text-nz-verde-claro">
            <Mail size={16} className="mt-0.5 flex-none text-nz-verde-claro" />
            <span data-teste="rodape-email">{EMAIL_CONTATO}</span>
          </a>
          <div className="flex items-start gap-2.5 text-white/60">
            <MapPin size={16} className="mt-0.5 flex-none text-nz-verde-claro" />
            <span className="leading-snug">{ENDERECO_SEDE}</span>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-[12px] leading-relaxed text-white/40">
          <p data-teste="rodape-cnpj">© {ano} {RAZAO_SOCIAL} · CNPJ {CNPJ}</p>
        </div>
      </div>
    </footer>
  );
}
