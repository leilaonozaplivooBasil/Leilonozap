import React from 'react';
import { Scale } from 'lucide-react';

// ⚖️ BASE LEGAL DA CAPTAÇÃO PRIVADA — por que esta página não é oferta pública.
// Conteúdo institucional/informativo, sem valor financeiro e sem promessa de retorno.
const ITENS = [
  {
    lei: 'Lei nº 6.385/1976, art. 19',
    texto:
      'Nenhuma emissão pública de valores mobiliários pode ser distribuída sem registro na CVM. Esta operação não é valor mobiliário e não é distribuída ao público: trata-se de parceria comercial privada, firmada por contrato bilateral entre partes identificadas.',
  },
  {
    lei: 'Resolução CVM nº 160/2022',
    texto:
      'Não há esforço de venda ao público, prospecto, corretagem, lista pública ou promessa de rentabilidade. O acesso às condições é individual, restrito a convidados e condicionado a identificação e aceite de confidencialidade.',
  },
  {
    lei: 'Código Civil, arts. 421 e 422 · Lei nº 10.406/2002',
    texto:
      'A relação é regida pela liberdade de contratar e pelos princípios de boa-fé e função social do contrato, com obrigações, prazos e forma de apuração do resultado descritos em instrumento particular assinado pelas partes.',
  },
  {
    lei: 'Lei nº 13.709/2018 (LGPD)',
    texto:
      'Os dados informados no cadastro são tratados exclusivamente para identificação do convidado, formalização do contrato e prestação de contas da operação, com registro de data e hora do aceite para fins de auditoria.',
  },
];

export default function ParceiroBaseLegal() {
  return (
    <section className="border-t border-pc-borda bg-pc-preto">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 flex items-center gap-3">
          <Scale className="h-4 w-4 text-pc-ouro" strokeWidth={1.8} />
          <p className="text-[10px] uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">
            Base legal · não é oferta pública
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden border border-pc-borda bg-pc-borda sm:grid-cols-2">
          {ITENS.map((i) => (
            <div key={i.lei} className="bg-pc-preto-2 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-pc-ouro">
                {i.lei}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-pc-tinta-fraca">{i.texto}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[10px] leading-relaxed text-pc-tinta-fraca">
          Material de caráter reservado, dirigido a convidado identificado. Não constitui oferta
          pública, captação de poupança popular, promessa de rentabilidade ou garantia de resultado
          futuro. A participação depende de análise, contrato assinado e aceite do termo de
          confidencialidade.
        </p>
      </div>
    </section>
  );
}