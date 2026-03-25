import React from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 py-8 px-4">
      <div className="max-w-3xl mx-auto">

        <Link to="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Termos de Uso</h1>
        </div>

        <div className="space-y-6 text-sm leading-relaxed">
          <p className="text-emerald-400 font-semibold text-xs uppercase tracking-widest">
            Efetivos a partir de 24 de março de 2026
          </p>

          <p>
            Ao acessar e utilizar a plataforma <strong className="text-white">Leilão NoZap</strong>, você declara que leu, compreendeu e concorda integralmente com os presentes Termos de Uso.
          </p>

          <div>
            <h2 className="text-white font-semibold mb-2 text-base">1. Objeto e Definições</h2>
            <p>
              O <strong className="text-white">Leilão NoZap</strong> é uma <strong className="text-white">plataforma digital de vendas</strong>, não um leilão oficial regido por leiloeiro público. Os produtos comercializados são arrematados de e-commerces dentro do prazo legal de devolução (7 dias), itens de mostruário ou de repasse, todos devidamente testados e funcionais.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-2 text-base">2. Cadastro e Responsabilidades do Usuário</h2>
            <ul className="space-y-1.5 pl-4">
              <li>• O usuário deve fornecer informações verídicas, completas e atualizadas no cadastro.</li>
              <li>• É responsabilidade do usuário manter sua senha em sigilo. Qualquer acesso com suas credenciais é de sua responsabilidade.</li>
              <li>• É proibido o uso de dados de terceiros sem autorização expressa.</li>
              <li>• Menores de 18 anos devem ter autorização de responsável legal para utilizar a plataforma.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-2 text-base">3. Funcionamento dos Leilões e Lances</h2>
            <ul className="space-y-1.5 pl-4">
              <li>• Um lance registrado é uma oferta de compra vinculante. Ao dar um lance, o usuário se compromete a efetuar o pagamento caso seja o vencedor.</li>
              <li>• O Leilão NoZap se reserva o direito de cancelar lances ou leilões em caso de suspeita de fraude, erro de sistema ou força maior.</li>
              <li>• Os preços são definidos pelo leiloeiro e refletem o caráter de repasse dos produtos.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-2 text-base">4. Pagamento</h2>
            <ul className="space-y-1.5 pl-4">
              <li>• O pagamento deve ser realizado dentro do prazo informado após o arremate, utilizando os métodos disponíveis na plataforma (Pix, boleto, cartão — via Asaas).</li>
              <li>• O não pagamento no prazo poderá resultar na suspensão ou cancelamento da conta do usuário.</li>
              <li>• Os dados de pagamento são tratados exclusivamente pelo gateway Asaas e sujeitos à política de privacidade deste.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-2 text-base">5. Política de Não Devolução</h2>
            <p>
              Por se tratar de produtos de repasse, <strong className="text-white">não há direito a devolução ou troca</strong> após o arremate e pagamento, salvo nos casos de defeito de funcionamento não descrito no anúncio. Neste caso, o usuário deverá acionar o suporte em até <strong className="text-white">48 horas</strong> após o recebimento.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-2 text-base">6. Garantia dos Produtos</h2>
            <p>
              Os produtos <strong className="text-white">não possuem garantia do fabricante</strong>, pois se trata de mercadoria de repasse. O Leilão NoZap garante que os itens foram testados e estão funcionais conforme descrito no anúncio.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-2 text-base">7. Conduta do Usuário</h2>
            <p className="mb-2">O usuário se compromete a não:</p>
            <ul className="space-y-1.5 pl-4">
              <li>• Praticar atos ilegais, fraudulentos ou contrários à ordem pública.</li>
              <li>• Difundir conteúdo racista, xenofóbico, pornográfico ou que atente contra direitos humanos.</li>
              <li>• Introduzir vírus, malware ou qualquer software que possa causar danos à plataforma ou a terceiros.</li>
              <li>• Realizar lances sem intenção real de compra (lances fictícios).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-2 text-base">8. Limitação de Responsabilidade</h2>
            <p>
              O Leilão NoZap não se responsabiliza por danos indiretos, lucros cessantes ou prejuízos decorrentes do uso da plataforma, falhas de conectividade, ou atrasos de envio por parte das transportadoras.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-2 text-base">9. Modificações</h2>
            <p>
              O Leilão NoZap reserva-se o direito de alterar estes Termos a qualquer tempo. As alterações serão comunicadas na plataforma. O uso continuado após a publicação das mudanças implica aceitação dos novos termos.
            </p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-2 text-base">10. Foro e Lei Aplicável</h2>
            <p>
              Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca da sede do Leilão NoZap para dirimir quaisquer controvérsias, com renúncia a qualquer outro por mais privilegiado que seja.
            </p>
          </div>

          <p className="text-gray-500 text-xs pt-4 border-t border-gray-800">
            Dúvidas? Entre em contato: <a href="mailto:no-reply@leilaonozap.com" className="text-emerald-400 hover:underline">no-reply@leilaonozap.com</a>
          </p>

          <p className="text-gray-500 text-xs">
            © 2026 Leilão NoZap. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}