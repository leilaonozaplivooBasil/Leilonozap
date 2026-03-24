import React from 'react';
import { X, FileText } from 'lucide-react';

export default function LegalTermsModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(17, 24, 39, 0.98)',
          border: '1px solid rgba(16,185,129,0.25)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(16,185,129,0.15)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)' }}
            >
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Termos de Uso</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div
          className="overflow-y-auto px-6 py-5 text-gray-300 text-sm leading-relaxed space-y-4"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(16,185,129,0.4) transparent' }}
        >
          <p className="text-emerald-400 font-semibold text-xs uppercase tracking-widest">
            Efetivos a partir de 24 de março de 2026
          </p>

          <p>
            Ao acessar e utilizar a plataforma <strong className="text-white">Leilão NoZap</strong>, você declara que leu, compreendeu e concorda integralmente com os presentes Termos de Uso.
          </p>

          {/* Seção 1 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">1. Objeto e Definições</h3>
            <p>
              O <strong className="text-white">Leilão NoZap</strong> é uma <strong className="text-white">plataforma digital de vendas</strong>, não um leilão oficial regido por leiloeiro público. Os produtos comercializados são arrematados de e-commerces dentro do prazo legal de devolução (7 dias), itens de mostruário ou de repasse, todos devidamente testados e funcionais.
            </p>
          </div>

          {/* Seção 2 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">2. Cadastro e Responsabilidades do Usuário</h3>
            <ul className="space-y-1.5 pl-4">
              <li>• O usuário deve fornecer informações verídicas, completas e atualizadas no cadastro.</li>
              <li>• É responsabilidade do usuário manter sua senha em sigilo. Qualquer acesso com suas credenciais é de sua responsabilidade.</li>
              <li>• É proibido o uso de dados de terceiros sem autorização expressa.</li>
              <li>• Menores de 18 anos devem ter autorização de responsável legal para utilizar a plataforma.</li>
            </ul>
          </div>

          {/* Seção 3 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">3. Funcionamento dos Leilões e Lances</h3>
            <ul className="space-y-1.5 pl-4">
              <li>• Um lance registrado é uma oferta de compra vinculante. Ao dar um lance, o usuário se compromete a efetuar o pagamento caso seja o vencedor.</li>
              <li>• O Leilão NoZap se reserva o direito de cancelar lances ou leilões em caso de suspeita de fraude, erro de sistema ou força maior.</li>
              <li>• Os preços são definidos pelo leiloeiro e refletem o caráter de repasse dos produtos.</li>
            </ul>
          </div>

          {/* Seção 4 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">4. Pagamento</h3>
            <ul className="space-y-1.5 pl-4">
              <li>• O pagamento deve ser realizado dentro do prazo informado após o arremate, utilizando os métodos disponíveis na plataforma (Pix, boleto, cartão — via Asaas).</li>
              <li>• O não pagamento no prazo poderá resultar na suspensão ou cancelamento da conta do usuário.</li>
              <li>• Os dados de pagamento são tratados exclusivamente pelo gateway Asaas e sujeitos à política de privacidade deste.</li>
            </ul>
          </div>

          {/* Seção 5 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">5. Política de Não Devolução</h3>
            <p>
              Por se tratar de produtos de repasse, <strong className="text-white">não há direito a devolução ou troca</strong> após o arremate e pagamento, salvo nos casos de defeito de funcionamento não descrito no anúncio. Neste caso, o usuário deverá acionar o suporte em até <strong className="text-white">48 horas</strong> após o recebimento.
            </p>
          </div>

          {/* Seção 6 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">6. Garantia dos Produtos</h3>
            <p>
              Os produtos <strong className="text-white">não possuem garantia do fabricante</strong>, pois se trata de mercadoria de repasse. O Leilão NoZap garante que os itens foram testados e estão funcionais conforme descrito no anúncio.
            </p>
          </div>

          {/* Seção 7 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">7. Conduta do Usuário</h3>
            <p className="mb-2">O usuário se compromete a não:</p>
            <ul className="space-y-1.5 pl-4">
              <li>• Praticar atos ilegais, fraudulentos ou contrários à ordem pública.</li>
              <li>• Difundir conteúdo racista, xenofóbico, pornográfico ou que atente contra direitos humanos.</li>
              <li>• Introduzir vírus, malware ou qualquer software que possa causar danos à plataforma ou a terceiros.</li>
              <li>• Realizar lances sem intenção real de compra (lances fictícios).</li>
            </ul>
          </div>

          {/* Seção 8 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">8. Limitação de Responsabilidade</h3>
            <p>
              O Leilão NoZap não se responsabiliza por danos indiretos, lucros cessantes ou prejuízos decorrentes do uso da plataforma, falhas de conectividade, ou atrasos de envio por parte das transportadoras.
            </p>
          </div>

          {/* Seção 9 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">9. Modificações</h3>
            <p>
              O Leilão NoZap reserva-se o direito de alterar estes Termos a qualquer tempo. As alterações serão comunicadas na plataforma. O uso continuado após a publicação das mudanças implica aceitação dos novos termos.
            </p>
          </div>

          {/* Seção 10 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">10. Foro e Lei Aplicável</h3>
            <p>
              Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca da sede do Leilão NoZap para dirimir quaisquer controvérsias, com renúncia a qualquer outro por mais privilegiado que seja.
            </p>
          </div>

          <p className="text-gray-500 text-xs pt-2">
            Dúvidas? Entre em contato:{' '}
            <a href="mailto:no-reply@leilaonozap.com" className="text-emerald-400 hover:underline">
              no-reply@leilaonozap.com
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(16,185,129,0.15)' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #059669, #065f46)' }}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
