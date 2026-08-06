// 📜 FONTE DE VERDADE do texto do Termo de Confidencialidade do Parceiro.
//
// Espelha e detalha a Cláusula 12 do Contrato de Parceria Comercial (sigilo por
// 5 anos), na mesma linguagem jurídica do contrato. Usado pela tela do painel.
// O gerador de PDF (api/_lib/termoSigiloPdf.js) mantém uma cópia própria por
// não poder importar código do app — QUALQUER alteração aqui deve ser refletida lá.

export const VERSAO_TERMO = '2026-08-06';

// Multa contratual (padrão de mercado para NDA comercial): valor fixo ou
// múltiplo do aporte, prevalecendo o maior, sem prejuízo de perdas e danos.
export const MULTA_FIXA = 50000;
export const MULTA_MULTIPLICADOR = 2;

export const PREAMBULO =
  'Pelo presente instrumento particular, de um lado COMPRAS FULL COMÉRCIO LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob nº 51.544.091/0001-67, com sede em Av. das Américas, 19.005, Torre 1, Sala 1106, Barra da Tijuca, Rio de Janeiro - RJ, 22790-704, neste ato representada por sua marca LEILÃO NOZAP, doravante denominada DIVULGADORA, e de outro lado o signatário identificado no bloco de assinatura deste termo, doravante denominado RECEPTOR, celebram o presente Termo de Confidencialidade, que se regerá pelas cláusulas e condições a seguir.';

export const SECOES = [
  ['1. DO OBJETO',
    '1.1. Este termo tem por objeto a proteção das informações confidenciais que a DIVULGADORA disponibilizar ao RECEPTOR em razão do acesso ao painel digital exclusivo do parceiro comercial, bem como em decorrência de tratativas, negociações ou execução do Contrato de Parceria Comercial e Participação em Operação Estruturada de Venda de Produtos.',
    '1.2. Este termo detalha e complementa a Cláusula 12 do Contrato de Parceria Comercial, permanecendo válido de forma autônoma, ainda que a parceria não venha a ser celebrada.'],
  ['2. DA DEFINIÇÃO DE INFORMAÇÃO CONFIDENCIAL',
    '2.1. Considera-se informação confidencial, independentemente de estar ou não assinalada como tal, toda informação de natureza estratégica, comercial, operacional, financeira, técnica ou cadastral a que o RECEPTOR tenha acesso, incluindo, sem limitação:',
    '- metodologia própria de curadoria, critérios de curva ABC, análise de liquidez e cálculo de rentabilidade;',
    '- estrutura de precificação, margens praticadas, custos de aquisição e planilhas de análise de lotes;',
    '- identidade de fornecedores, origens de lotes, canais de aquisição e condições comerciais negociadas;',
    '- oportunidades do dia, lotes em avaliação, resultados apurados e demonstrativos operacionais;',
    '- estrutura da rede comercial, planos de carreira, políticas de remuneração e base de clientes;',
    '- funcionamento interno da plataforma, painéis, rotinas, integrações e dados de operação.',
    '2.2. Não se considera confidencial a informação que: (a) seja de domínio público sem violação deste termo; (b) já estivesse legitimamente em poder do RECEPTOR, comprovadamente, antes do acesso; ou (c) deva ser divulgada por ordem de autoridade competente, hipótese em que o RECEPTOR notificará previamente a DIVULGADORA, quando legalmente possível.'],
  ['3. DAS OBRIGAÇÕES DO RECEPTOR',
    '3.1. Manter sigilo absoluto sobre as informações confidenciais, empregando, no mínimo, o mesmo grau de zelo que dispensa às suas próprias informações sigilosas.',
    '3.2. Utilizar as informações confidenciais exclusivamente para avaliar e executar a parceria comercial, sendo vedado qualquer outro uso.',
    '3.3. Não reproduzir, copiar, fotografar, gravar, imprimir, exportar, encaminhar ou compartilhar, total ou parcialmente, telas, planilhas, análises, relatórios, listas, documentos ou dados obtidos no painel.',
    '3.4. Não divulgar as informações a terceiros, incluindo sócios, familiares, prepostos, consultores ou concorrentes, salvo autorização prévia e por escrito da DIVULGADORA.',
    '3.5. Não utilizar as informações confidenciais para desenvolver, direta ou indiretamente, por si ou por interposta pessoa, operação, negócio ou serviço concorrente que replique a metodologia, os fornecedores ou a estrutura comercial da DIVULGADORA.',
    '3.6. Não abordar, contatar ou negociar com fornecedores, leiloeiros ou parceiros comerciais identificados por meio das informações confidenciais, sem anuência escrita da DIVULGADORA.',
    '3.7. Comunicar imediatamente à DIVULGADORA qualquer perda, extravio, acesso indevido ou divulgação não autorizada de informação confidencial.',
    '3.8. Devolver ou destruir, mediante solicitação da DIVULGADORA, todo material que contenha informação confidencial, confirmando o cumprimento por escrito.'],
  ['4. DA IDENTIFICAÇÃO DO SIGNATÁRIO',
    '4.1. Para a validade e a rastreabilidade deste termo, o RECEPTOR declara serem verdadeiros os dados cadastrais informados e apresenta cópia digital de documento oficial de identidade e de comprovação do CPF, anexados no ato da assinatura.',
    '4.2. O RECEPTOR autoriza o armazenamento dos documentos apresentados e dos dados de assinatura exclusivamente para fins de comprovação de identidade, auditoria e defesa de direitos, nos termos do art. 7º, incisos V e VI, da Lei nº 13.709/2018 (LGPD).',
    '4.3. A prestação de informação falsa ou a apresentação de documento inautêntico configura descumprimento grave deste termo, autorizando a imediata revogação do acesso, sem prejuízo das sanções civis e penais aplicáveis.'],
  ['5. DA VIGÊNCIA DO SIGILO',
    '5.1. A obrigação de sigilo vigora a partir da assinatura deste termo e subsistirá pelo prazo de 5 (cinco) anos contados do encerramento da relação entre as partes ou do último acesso do RECEPTOR às informações confidenciais, prevalecendo o evento mais recente, em conformidade com a Cláusula 12 do Contrato de Parceria Comercial.',
    '5.2. A extinção, a rescisão ou a não celebração do Contrato de Parceria Comercial não exonera o RECEPTOR das obrigações aqui assumidas.'],
  ['6. DA MULTA CONTRATUAL E DAS PERDAS E DANOS',
    '6.1. O descumprimento de qualquer obrigação prevista neste termo sujeita o RECEPTOR ao pagamento de multa não compensatória, exigível de imediato, no valor de R$ 50.000,00 (cinquenta mil reais) ou o equivalente a 2 (duas) vezes o valor do capital por ele aportado na parceria, prevalecendo o maior, por cada evento de violação.',
    '6.2. A multa prevista na cláusula 6.1 não substitui nem limita a indenização por perdas e danos, lucros cessantes e danos emergentes efetivamente apurados, nos termos dos artigos 402, 416 e 884 do Código Civil.',
    '6.3. Constatada violação, a DIVULGADORA poderá suspender ou revogar imediatamente o acesso do RECEPTOR ao painel e às informações confidenciais, sem necessidade de notificação prévia.',
    '6.4. As partes reconhecem que a violação de sigilo causa dano de difícil reparação, autorizando a DIVULGADORA a pleitear tutela de urgência para cessação da conduta, independentemente da cobrança da multa.',
    '6.5. Os valores devidos serão corrigidos monetariamente pelo IPCA, acrescidos de juros de mora de 1% (um por cento) ao mês e de honorários advocatícios, na forma da lei.'],
  ['7. DA AUSÊNCIA DE CESSÃO DE DIREITOS',
    '7.1. O acesso às informações confidenciais não transfere ao RECEPTOR qualquer direito de propriedade intelectual, licença, know-how, marca ou titularidade sobre a metodologia, os sistemas ou os dados da DIVULGADORA.',
    '7.2. Este termo não cria vínculo societário, associativo, empregatício ou de representação entre as partes.'],
  ['8. DA ASSINATURA ELETRÔNICA E DAS DISPOSIÇÕES GERAIS',
    '8.1. Este termo é firmado por assinatura eletrônica, mediante marcação de aceite, aposição de assinatura de próprio punho em campo digital e registro de data, hora, endereço IP, dispositivo e código de verificação, nos termos da Lei nº 14.063/2020 e da Medida Provisória nº 2.200-2/2001, sendo plenamente válido e eficaz entre as partes.',
    '8.2. A tolerância quanto ao descumprimento de qualquer obrigação não implica renúncia, novação ou alteração deste termo.',
    '8.3. Caso qualquer cláusula seja declarada nula ou inexequível, as demais permanecerão plenamente válidas e eficazes.',
    '8.4. Este termo obriga as partes, seus sucessores e cessionários a qualquer título.'],
  ['9. DO FORO',
    '9.1. Fica eleito o foro da comarca do Rio de Janeiro/RJ, com renúncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer questões oriundas deste termo.'],
];