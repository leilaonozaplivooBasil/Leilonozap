import React from 'react';
import { Link } from 'react-router-dom';
import { Info, Wallet, Gavel, RotateCcw, Clock, Gift, Truck, ShieldCheck, Scale, Megaphone, PackageOpen, Factory, Boxes } from 'lucide-react';
import Lamina from '@/components/comofunciona/Lamina';
import PassoCard from '@/components/comofunciona/PassoCard';
import CartaoDemo from '@/components/comofunciona/CartaoDemo';
import BotaoCarteiraDigital from '@/components/comofunciona/BotaoCarteiraDigital';

const PASSOS = [
  { numero: 1, titulo: 'Deposite na Carteira Digital', texto: 'O saldo da carteira é o que libera seus lances. Depósito por PIX, na hora.' },
  { numero: 2, titulo: 'Entre na sala e dê seu lance', texto: 'Ao dar o lance, o valor do lance + o frete ficam reservados na sua carteira.' },
  { numero: 3, titulo: 'Foi superado? Volta tudo', texto: 'Se alguém cobrir seu lance, o valor do lance e do frete voltam na hora para o seu saldo.' },
  { numero: 4, titulo: 'Arrematou? Receba em casa', texto: 'O martelo bate, o valor reservado é usado no pagamento e o produto sai para entrega.' },
];

const BENEFICIOS = [
  { icon: Wallet, titulo: 'Saldo exclusivo do leilão', texto: 'O valor depositado na Carteira Digital é destinado à participação nos leilões.' },
  { icon: RotateCcw, titulo: 'Lance coberto, saldo devolvido', texto: 'Nada fica retido: ao ser superado, lance e frete voltam integralmente ao seu saldo.' },
  { icon: Clock, titulo: 'Respeite o prazo do leilão', texto: 'O arremate só acontece quando o prazo do lote termina. Até lá, o saldo fica reservado.' },
  { icon: Truck, titulo: 'Frete calculado antes', texto: 'Você já sabe o valor da entrega antes de dar o lance — sem surpresa depois.' },
];

export default function ComoFunciona() {
  return (
    <div className="w-full bg-white">
      {/* LÂMINA 1 — ABERTURA */}
      <Lamina
        eyebrow="Como funciona"
        titulo="Lance, arremate e receba em casa."
        apoio="Entenda em poucos minutos como funciona o leilão do Leilão NoZap, o que acontece com o seu dinheiro em cada etapa e o bônus que você ganha se não arrematar."
        bg="var(--nz-verde-fundo)"
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/leiloes" className="rounded-full bg-nz-verde px-7 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85">
            Ver leilões ao vivo
          </Link>
          <Link to="/Loja-Virtual" className="rounded-full border border-nz-borda bg-white px-7 py-3 text-sm font-medium text-nz-tinta transition-opacity hover:opacity-70">
            Ir para a Loja Virtual
          </Link>
        </div>
      </Lamina>

      {/* LÂMINA 2 — AVISO LEGAL + ESTRATÉGIA DE MARKETING */}
      <Lamina
        eyebrow="Antes de começar"
        titulo="Não somos um leilão oficial."
        apoio="O Leilão NoZap é uma plataforma privada de vendas próprias. Não somos leiloeiro oficial, não realizamos leilões judiciais, extrajudiciais nem oficiais de qualquer natureza. O formato de lances é a nossa estratégia de marketing para vender barato de forma divertida e transparente."
        bg="#FFFFFF"
      >
        <div className="mx-auto max-w-2xl space-y-3 text-left">
          <div className="flex items-start gap-3 rounded-2xl border border-nz-borda bg-nz-cinza-fundo p-5">
            <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-nz-verde" />
            <p className="text-[0.94rem] leading-[1.55] text-nz-tinta-fraca">
              É uma <strong className="text-nz-tinta">venda direta com dinâmica de lances</strong>: o produto é nosso, o
              preço começa baixo e vai para quem fizer o melhor lance dentro do prazo. Usamos a palavra
              <strong className="text-nz-tinta"> “leilão”</strong> no sentido promocional da disputa — é uma
              <strong className="text-nz-tinta"> estratégia de marketing</strong>, não um leilão regulamentado.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-nz-borda bg-white p-5">
            <Scale className="mt-0.5 h-5 w-5 shrink-0 text-nz-verde" />
            <div>
              <p className="text-[0.98rem] font-semibold text-nz-tinta">A base legal</p>
              <p className="mt-1.5 text-[0.93rem] leading-[1.55] text-nz-tinta-fraca">
                O <strong className="text-nz-tinta">Decreto nº 21.981/1932</strong> regula a atividade do leiloeiro
                oficial — quem vende bens <em>de terceiros</em> em hasta pública. Aqui não é o caso: vendemos
                <strong className="text-nz-tinta"> mercadoria própria</strong>, por conta e risco nosso, o que é
                livre iniciativa garantida pelo <strong className="text-nz-tinta">art. 170 da Constituição
                Federal</strong>. A venda segue integralmente o
                <strong className="text-nz-tinta"> Código de Defesa do Consumidor (Lei nº 8.078/1990)</strong>, com
                nota fiscal, garantia e direito de arrependimento.
              </p>
            </div>
          </div>
        </div>
      </Lamina>

      {/* LÂMINA 2.5 — DE ONDE VÊM OS PRODUTOS */}
      <Lamina
        eyebrow="Origem dos produtos"
        titulo="De onde vêm os produtos tão baratos."
        apoio="Não tem mistério nem pegadinha: são três fontes, todas legítimas, que nos permitem vender muito abaixo do varejo."
        bg="var(--nz-verde-fundo)"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-nz-borda bg-white p-5 text-left">
            <PackageOpen className="mb-3 h-5 w-5 text-nz-verde" />
            <h3 className="text-[1.02rem] font-semibold text-nz-tinta">1. Devoluções de 7 dias</h3>
            <p className="mt-1.5 text-[0.92rem] leading-[1.55] text-nz-tinta-fraca">
              A maior parte do nosso estoque vem de <strong className="text-nz-tinta">devoluções por
              arrependimento</strong>. Pelo <strong className="text-nz-tinta">art. 49 do Código de Defesa do
              Consumidor</strong>, quem compra pela internet pode devolver em até <strong className="text-nz-tinta">7
              dias</strong>, sem precisar justificar. O produto volta ao lojista — e, mesmo novo e funcionando, ele
              <strong className="text-nz-tinta"> não pode mais ser vendido como “novo lacrado”</strong>.
              Compramos esses lotes e repassamos com desconto enorme.
            </p>
          </div>

          <div className="rounded-2xl border border-nz-borda bg-white p-5 text-left">
            <Factory className="mb-3 h-5 w-5 text-nz-verde" />
            <h3 className="text-[1.02rem] font-semibold text-nz-tinta">2. Direto de fábrica</h3>
            <p className="mt-1.5 text-[0.92rem] leading-[1.55] text-nz-tinta-fraca">
              Trabalhamos com <strong className="text-nz-tinta">indústrias e parceiros nossos</strong>, comprando
              direto da fonte, sem atravessador. Produto novo, com preço de atacado, que chega até você sem a
              margem de três ou quatro intermediários no meio do caminho.
            </p>
          </div>

          <div className="rounded-2xl border border-nz-borda bg-white p-5 text-left">
            <Boxes className="mb-3 h-5 w-5 text-nz-verde" />
            <h3 className="text-[1.02rem] font-semibold text-nz-tinta">3. Estoque próprio negociado</h3>
            <p className="mt-1.5 text-[0.92rem] leading-[1.55] text-nz-tinta-fraca">
              Compramos <strong className="text-nz-tinta">antecipadamente e em volume</strong>, pagando à vista e
              negociando duro. Esse desconto que conquistamos na compra é exatamente o desconto que você encontra
              aqui na disputa.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-3 flex max-w-3xl items-start gap-3 rounded-2xl border border-nz-borda bg-white p-5 text-left">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-nz-verde" />
          <p className="text-[0.92rem] leading-[1.55] text-nz-tinta-fraca">
            A condição de cada item é sempre informada na descrição do lote — novo, novo de fábrica ou devolução
            dentro dos 7 dias. <strong className="text-nz-tinta">Transparência total antes do seu lance.</strong>
          </p>
        </div>
      </Lamina>

      {/* LÂMINA 3 — OS 4 PASSOS */}
      <Lamina
        eyebrow="Passo a passo"
        titulo="Quatro passos, do depósito à entrega."
        apoio="É simples e o dinheiro é sempre seu até o martelo bater."
        bg="var(--nz-cinza-fundo)"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((p) => (
            <PassoCard key={p.numero} {...p} />
          ))}
        </div>
      </Lamina>

      {/* LÂMINA 4 — COMO O DINHEIRO SE MOVE (escura, destaque) */}
      <Lamina
        eyebrow="Seu dinheiro"
        titulo="Como o seu saldo se movimenta."
        apoio="Nada é cobrado por fora. Tudo acontece dentro da sua Carteira Digital, e você acompanha cada movimento."
        bg="var(--nz-verde-escuro)"
        escuro
      >
        <div className="mb-6 sm:mb-8">
          <CartaoDemo />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-5 text-left">
            <Gavel className="mb-3 h-5 w-5 text-white/80" />
            <h3 className="text-[1.02rem] font-semibold text-white">Ao dar o lance</h3>
            <p className="mt-1.5 text-[0.92rem] leading-[1.5] text-white/70">
              O valor do <strong className="text-white">lance</strong> mais o <strong className="text-white">frete</strong> saem do seu saldo
              disponível e ficam <strong className="text-white">reservados</strong>. Reservado não é gasto: é apenas garantia de que você
              honra o lance se vencer.
            </p>
          </div>
          <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-5 text-left">
            <RotateCcw className="mb-3 h-5 w-5 text-white/80" />
            <h3 className="text-[1.02rem] font-semibold text-white">Se você for superado</h3>
            <p className="mt-1.5 text-[0.92rem] leading-[1.5] text-white/70">
              No mesmo instante em que alguém cobre o seu lance, o <strong className="text-white">lance e o frete voltam
              integralmente</strong> para o seu saldo disponível — livres para você usar em outro lote.
            </p>
          </div>
          <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-5 text-left">
            <Clock className="mb-3 h-5 w-5 text-white/80" />
            <h3 className="text-[1.02rem] font-semibold text-white">Enquanto o leilão corre</h3>
            <p className="mt-1.5 text-[0.92rem] leading-[1.5] text-white/70">
              O arremate só é confirmado quando o <strong className="text-white">prazo do leilão termina</strong>. Se você está na
              frente, seu saldo continua reservado até o martelo bater.
            </p>
          </div>
          <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-5 text-left">
            <ShieldCheck className="mb-3 h-5 w-5 text-white/80" />
            <h3 className="text-[1.02rem] font-semibold text-white">Se você arrematar</h3>
            <p className="mt-1.5 text-[0.92rem] leading-[1.5] text-white/70">
              O valor reservado é usado no pagamento do produto e do frete. Sem boleto extra, sem cobrança
              surpresa: o pedido já entra para separação e entrega.
            </p>
          </div>
        </div>
      </Lamina>

      {/* LÂMINA 5 — BÔNUS 10% */}
      <Lamina
        eyebrow="Bônus de quem não arrematou"
        titulo="Não arrematou? Ganhe 10% a mais."
        apoio="Ninguém sai perdendo. Se você participou e não levou o produto, o seu saldo volta com 10% de bônus para usar na Loja Virtual."
        bg="var(--nz-verde-fundo)"
      >
        <div className="mx-auto max-w-2xl rounded-2xl border border-nz-borda bg-white p-6 text-left">
          <div className="flex items-start gap-3">
            <Gift className="mt-0.5 h-6 w-6 shrink-0 text-nz-verde" />
            <div>
              <p className="text-[0.98rem] font-semibold text-nz-tinta">Como funciona o bônus</p>
              <p className="mt-1.5 text-[0.93rem] leading-[1.55] text-nz-tinta-fraca">
                Terminou o leilão e o produto foi para outra pessoa? O valor que estava reservado volta para a sua
                Carteira Digital e você recebe <strong className="text-nz-verde">mais 10% de bônus</strong> para gastar na Loja
                Virtual — ou seja, além de receber tudo de volta, você compra com desconto extra.
              </p>
              <Link
                to="/Loja-Virtual"
                className="mt-4 inline-flex rounded-full bg-nz-verde px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85"
              >
                Usar meu bônus na Loja Virtual
              </Link>
            </div>
          </div>
        </div>
      </Lamina>

      {/* LÂMINA 6 — VANTAGENS */}
      <Lamina
        eyebrow="Por que é seguro"
        titulo="Regras claras, do início ao fim."
        bg="#FFFFFF"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BENEFICIOS.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="flex items-start gap-3 rounded-2xl border border-nz-borda bg-nz-cinza-fundo p-5 text-left">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-nz-verde" />
              <div>
                <h3 className="text-[1rem] font-semibold text-nz-tinta">{titulo}</h3>
                <p className="mt-1 text-[0.92rem] leading-[1.5] text-nz-tinta-fraca">{texto}</p>
              </div>
            </div>
          ))}
        </div>
      </Lamina>

      {/* LÂMINA 7 — CHAMADA FINAL */}
      <Lamina
        titulo="Pronto para o seu primeiro lance?"
        apoio="Deposite, escolha o lote e acompanhe o martelo bater ao vivo."
        bg="var(--nz-verde-escuro)"
        escuro
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/leiloes" className="rounded-full bg-white px-7 py-3 text-sm font-medium text-nz-verde-escuro transition-opacity hover:opacity-85">
            Entrar na sala de leilão
          </Link>
          <BotaoCarteiraDigital />
        </div>
      </Lamina>
    </div>
  );
}