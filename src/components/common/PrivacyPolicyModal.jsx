import React from 'react';
import { X, Shield } from 'lucide-react';

export default function PrivacyPolicyModal({ onClose }) {
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
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Política de Privacidade</h2>
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
        <div className="overflow-y-auto px-6 py-5 text-gray-300 text-sm leading-relaxed space-y-4"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(16,185,129,0.4) transparent' }}
        >
          <p className="text-emerald-400 font-semibold text-xs uppercase tracking-widest">
            Efetiva a partir de 24 de março de 2026
          </p>

          <p>
            A sua privacidade é importante para nós. Esta Política de Privacidade descreve como o <strong className="text-white">Leilão NoZap</strong> coleta, usa, armazena e protege seus dados pessoais, em conformidade com a <strong className="text-white">Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
          </p>

          {/* Seção 1 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">1. Dados Coletados</h3>
            <p className="mb-2">Coletamos apenas os dados necessários para a prestação dos nossos serviços:</p>
            <ul className="space-y-1.5 pl-4">
              <li>• <span className="text-white font-medium">Dados de identificação:</span> nome completo, e-mail, CPF ou CNPJ.</li>
              <li>• <span className="text-white font-medium">Dados de contato:</span> número de telefone / WhatsApp, endereço de entrega.</li>
              <li>• <span className="text-white font-medium">Dados financeiros:</span> histórico de compras, lances e transações realizadas na plataforma. As informações de pagamento (cartão, boleto) são processadas diretamente pelo gateway <strong className="text-white">Asaas</strong> e não são armazenadas em nossos servidores.</li>
              <li>• <span className="text-white font-medium">Dados de uso:</span> endereço IP, tipo de dispositivo e registros de acesso à plataforma.</li>
            </ul>
          </div>

          {/* Seção 2 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">2. Finalidade e Base Legal</h3>
            <ul className="space-y-1.5 pl-4">
              <li>• Execução de contrato de compra e venda (Art. 7º, V da LGPD).</li>
              <li>• Cumprimento de obrigação legal ou regulatória (Art. 7º, II).</li>
              <li>• Legítimo interesse: prevenção a fraudes, segurança da plataforma e melhoria dos serviços (Art. 7º, IX).</li>
              <li>• Consentimento: comunicações de marketing e ofertas, quando você optar por recebê-las (Art. 7º, I).</li>
            </ul>
          </div>

          {/* Seção 3 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">3. Compartilhamento de Dados</h3>
            <p>
              Não vendemos nem compartilhamos seus dados com terceiros para fins comerciais. O compartilhamento ocorre somente:
            </p>
            <ul className="space-y-1.5 pl-4 mt-2">
              <li>• Com o gateway de pagamento <strong className="text-white">Asaas</strong>, para processamento de cobranças.</li>
              <li>• Com transportadoras, para viabilizar entrega de produtos adquiridos.</li>
              <li>• Quando exigido por lei, ordem judicial ou autoridade competente.</li>
            </ul>
          </div>

          {/* Seção 4 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">4. Retenção e Segurança</h3>
            <p>
              Seus dados são mantidos pelo tempo necessário para cumprir as finalidades descritas nesta política ou para atender obrigações legais. Utilizamos medidas técnicas e organizacionais adequadas para proteger os dados contra acesso não autorizado, perda ou alteração.
            </p>
          </div>

          {/* Seção 5 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">5. Seus Direitos (LGPD)</h3>
            <p className="mb-2">Você tem o direito de, a qualquer momento:</p>
            <ul className="space-y-1.5 pl-4">
              <li>• <span className="text-white font-medium">Acessar</span> os dados que temos sobre você.</li>
              <li>• <span className="text-white font-medium">Corrigir</span> dados incompletos, inexatos ou desatualizados.</li>
              <li>• <span className="text-white font-medium">Solicitar a eliminação</span> dos dados desnecessários ou tratados em desconformidade.</li>
              <li>• <span className="text-white font-medium">Revogar o consentimento</span> para finalidades baseadas em consentimento.</li>
              <li>• <span className="text-white font-medium">Solicitar a portabilidade</span> dos seus dados a outro fornecedor.</li>
              <li>• <span className="text-white font-medium">Obter informações</span> sobre o compartilhamento dos seus dados.</li>
            </ul>
          </div>

          {/* Seção 6 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">6. Links Externos</h3>
            <p>
              Nossa plataforma pode conter links para sites de parceiros. Não temos controle sobre as práticas de privacidade desses sites e recomendamos que você leia as respectivas políticas.
            </p>
          </div>

          {/* Seção 7 */}
          <div>
            <h3 className="text-white font-semibold mb-2 text-base">7. Contato — Encarregado de Dados (DPO)</h3>
            <p>
              Para exercer seus direitos ou tirar dúvidas sobre o tratamento dos seus dados, entre em contato:
            </p>
            <p className="mt-2">
              📧{' '}
              <a
                href="mailto:no-reply@leilaonozap.com"
                className="text-emerald-400 hover:underline"
              >
                no-reply@leilaonozap.com
              </a>
            </p>
          </div>
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
