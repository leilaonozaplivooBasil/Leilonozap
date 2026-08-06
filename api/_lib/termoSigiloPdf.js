// 📄 Gerador do PDF do TERMO DE CONFIDENCIALIDADE do Parceiro.
//
// Documento PRÓPRIO (não é o contrato): cabeçalho institucional, texto do sigilo
// com multa contratual, campos de assinatura e bloco de autenticidade.
//
// ⚠️ FONTE DE VERDADE do texto: src/lib/termoSigiloTexto.js. Esta é uma cópia
// deliberada — a rota Vercel não importa código do app. Alterou lá? Altere aqui.
// Acentos são removidos porque a fonte padrão do jsPDF (helvetica) não suporta UTF-8.
import { jsPDF } from 'jspdf';

const ACENTOS = {
  á: 'a', à: 'a', ã: 'a', â: 'a', ä: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i', ó: 'o', ò: 'o', õ: 'o', ô: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u', ç: 'c', ñ: 'n',
  Á: 'A', À: 'A', Ã: 'A', Â: 'A', Ä: 'A', É: 'E', È: 'E', Ê: 'E', Ë: 'E',
  Í: 'I', Ì: 'I', Î: 'I', Ï: 'I', Ó: 'O', Ò: 'O', Õ: 'O', Ô: 'O', Ö: 'O',
  Ú: 'U', Ù: 'U', Û: 'U', Ü: 'U', Ç: 'C', Ñ: 'N', º: 'o', ª: 'a',
};

function semAcento(txt) {
  return String(txt || '').split('').map((c) => ACENTOS[c] || c).join('');
}

export const VERSAO_TERMO = '2026-08-06';

const PREAMBULO = 'Pelo presente instrumento particular, de um lado COMPRAS FULL COMERCIO LTDA, pessoa juridica de direito privado, inscrita no CNPJ sob n. 51.544.091/0001-67, com sede em Av. das Americas, 19.005, Torre 1, Sala 1106, Barra da Tijuca, Rio de Janeiro - RJ, 22790-704, neste ato representada por sua marca LEILAO NOZAP, doravante denominada DIVULGADORA, e de outro lado o signatario identificado no bloco de assinatura deste termo, doravante denominado RECEPTOR, celebram o presente Termo de Confidencialidade, que se regera pelas clausulas e condicoes a seguir.';

const SECOES = [
  ['1. DO OBJETO',
    '1.1. Este termo tem por objeto a protecao das informacoes confidenciais que a DIVULGADORA disponibilizar ao RECEPTOR em razao do acesso ao painel digital exclusivo do parceiro comercial, bem como em decorrencia de tratativas, negociacoes ou execucao do Contrato de Parceria Comercial e Participacao em Operacao Estruturada de Venda de Produtos.',
    '1.2. Este termo detalha e complementa a Clausula 12 do Contrato de Parceria Comercial, permanecendo valido de forma autonoma, ainda que a parceria nao venha a ser celebrada.'],
  ['2. DA DEFINICAO DE INFORMACAO CONFIDENCIAL',
    '2.1. Considera-se informacao confidencial, independentemente de estar ou nao assinalada como tal, toda informacao de natureza estrategica, comercial, operacional, financeira, tecnica ou cadastral a que o RECEPTOR tenha acesso, incluindo, sem limitacao:',
    '- metodologia propria de curadoria, criterios de curva ABC, analise de liquidez e calculo de rentabilidade;',
    '- estrutura de precificacao, margens praticadas, custos de aquisicao e planilhas de analise de lotes;',
    '- identidade de fornecedores, origens de lotes, canais de aquisicao e condicoes comerciais negociadas;',
    '- oportunidades do dia, lotes em avaliacao, resultados apurados e demonstrativos operacionais;',
    '- estrutura da rede comercial, planos de carreira, politicas de remuneracao e base de clientes;',
    '- funcionamento interno da plataforma, paineis, rotinas, integracoes e dados de operacao.',
    '2.2. Nao se considera confidencial a informacao que: (a) seja de dominio publico sem violacao deste termo; (b) ja estivesse legitimamente em poder do RECEPTOR, comprovadamente, antes do acesso; ou (c) deva ser divulgada por ordem de autoridade competente, hipotese em que o RECEPTOR notificara previamente a DIVULGADORA, quando legalmente possivel.'],
  ['3. DAS OBRIGACOES DO RECEPTOR',
    '3.1. Manter sigilo absoluto sobre as informacoes confidenciais, empregando, no minimo, o mesmo grau de zelo que dispensa as suas proprias informacoes sigilosas.',
    '3.2. Utilizar as informacoes confidenciais exclusivamente para avaliar e executar a parceria comercial, sendo vedado qualquer outro uso.',
    '3.3. Nao reproduzir, copiar, fotografar, gravar, imprimir, exportar, encaminhar ou compartilhar, total ou parcialmente, telas, planilhas, analises, relatorios, listas, documentos ou dados obtidos no painel.',
    '3.4. Nao divulgar as informacoes a terceiros, incluindo socios, familiares, prepostos, consultores ou concorrentes, salvo autorizacao previa e por escrito da DIVULGADORA.',
    '3.5. Nao utilizar as informacoes confidenciais para desenvolver, direta ou indiretamente, por si ou por interposta pessoa, operacao, negocio ou servico concorrente que replique a metodologia, os fornecedores ou a estrutura comercial da DIVULGADORA.',
    '3.6. Nao abordar, contatar ou negociar com fornecedores, leiloeiros ou parceiros comerciais identificados por meio das informacoes confidenciais, sem anuencia escrita da DIVULGADORA.',
    '3.7. Comunicar imediatamente a DIVULGADORA qualquer perda, extravio, acesso indevido ou divulgacao nao autorizada de informacao confidencial.',
    '3.8. Devolver ou destruir, mediante solicitacao da DIVULGADORA, todo material que contenha informacao confidencial, confirmando o cumprimento por escrito.'],
  ['4. DA IDENTIFICACAO DO SIGNATARIO',
    '4.1. Para a validade e a rastreabilidade deste termo, o RECEPTOR declara serem verdadeiros os dados cadastrais informados e apresenta copia digital de documento oficial de identidade e de comprovacao do CPF, anexados no ato da assinatura.',
    '4.2. O RECEPTOR autoriza o armazenamento dos documentos apresentados e dos dados de assinatura exclusivamente para fins de comprovacao de identidade, auditoria e defesa de direitos, nos termos do art. 7., incisos V e VI, da Lei n. 13.709/2018 (LGPD).',
    '4.3. A prestacao de informacao falsa ou a apresentacao de documento inautentico configura descumprimento grave deste termo, autorizando a imediata revogacao do acesso, sem prejuizo das sancoes civis e penais aplicaveis.'],
  ['5. DA VIGENCIA DO SIGILO',
    '5.1. A obrigacao de sigilo vigora a partir da assinatura deste termo e subsistira pelo prazo de 5 (cinco) anos contados do encerramento da relacao entre as partes ou do ultimo acesso do RECEPTOR as informacoes confidenciais, prevalecendo o evento mais recente, em conformidade com a Clausula 12 do Contrato de Parceria Comercial.',
    '5.2. A extincao, a rescisao ou a nao celebracao do Contrato de Parceria Comercial nao exonera o RECEPTOR das obrigacoes aqui assumidas.'],
  ['6. DA MULTA CONTRATUAL E DAS PERDAS E DANOS',
    '6.1. O descumprimento de qualquer obrigacao prevista neste termo sujeita o RECEPTOR ao pagamento de multa nao compensatoria, exigivel de imediato, no valor de R$ 50.000,00 (cinquenta mil reais) ou o equivalente a 2 (duas) vezes o valor do capital por ele aportado na parceria, prevalecendo o maior, por cada evento de violacao.',
    '6.2. A multa prevista na clausula 6.1 nao substitui nem limita a indenizacao por perdas e danos, lucros cessantes e danos emergentes efetivamente apurados, nos termos dos artigos 402, 416 e 884 do Codigo Civil.',
    '6.3. Constatada violacao, a DIVULGADORA podera suspender ou revogar imediatamente o acesso do RECEPTOR ao painel e as informacoes confidenciais, sem necessidade de notificacao previa.',
    '6.4. As partes reconhecem que a violacao de sigilo causa dano de dificil reparacao, autorizando a DIVULGADORA a pleitear tutela de urgencia para cessacao da conduta, independentemente da cobranca da multa.',
    '6.5. Os valores devidos serao corrigidos monetariamente pelo IPCA, acrescidos de juros de mora de 1% (um por cento) ao mes e de honorarios advocaticios, na forma da lei.'],
  ['7. DA AUSENCIA DE CESSAO DE DIREITOS',
    '7.1. O acesso as informacoes confidenciais nao transfere ao RECEPTOR qualquer direito de propriedade intelectual, licenca, know-how, marca ou titularidade sobre a metodologia, os sistemas ou os dados da DIVULGADORA.',
    '7.2. Este termo nao cria vinculo societario, associativo, empregaticio ou de representacao entre as partes.'],
  ['8. DA ASSINATURA ELETRONICA E DAS DISPOSICOES GERAIS',
    '8.1. Este termo e firmado por assinatura eletronica, mediante marcacao de aceite, aposicao de assinatura de proprio punho em campo digital e registro de data, hora, endereco IP, dispositivo e codigo de verificacao, nos termos da Lei n. 14.063/2020 e da Medida Provisoria n. 2.200-2/2001, sendo plenamente valido e eficaz entre as partes.',
    '8.2. A tolerancia quanto ao descumprimento de qualquer obrigacao nao implica renuncia, novacao ou alteracao deste termo.',
    '8.3. Caso qualquer clausula seja declarada nula ou inexequivel, as demais permanecerao plenamente validas e eficazes.',
    '8.4. Este termo obriga as partes, seus sucessores e cessionarios a qualquer titulo.'],
  ['9. DO FORO',
    '9.1. Fica eleito o foro da comarca do Rio de Janeiro/RJ, com renuncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer questoes oriundas deste termo.'],
];

/**
 * Gera o PDF do Termo de Confidencialidade.
 * @returns {string} PDF em base64 puro (sem prefixo data:)
 */
export function gerarTermoSigiloPdfBase64(dados = {}) {
  const nome = dados.partner_name || '____________________';
  const cpf = dados.partner_cpf || '____________________';
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 18;

  const texto = (t, size = 9.5, bold = false, cor = [51, 51, 51]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(cor[0], cor[1], cor[2]);
    for (const linha of doc.splitTextToSize(semAcento(t), maxWidth)) {
      if (y > 272) { doc.addPage(); y = 20; }
      doc.text(linha, margin, y);
      y += size * 0.5;
    }
    y += 2.5;
  };

  // Cabeçalho institucional
  doc.setFillColor(10, 10, 11);
  doc.rect(pageWidth / 2 - 27, y, 54, 14, 'F');
  doc.setFontSize(10);
  doc.setTextColor(201, 165, 92);
  doc.setFont('helvetica', 'bold');
  doc.text('LEILAO NOZAP', pageWidth / 2, y + 9, { align: 'center' });
  y += 24;

  doc.setFontSize(13);
  doc.setTextColor(10, 10, 11);
  doc.text(semAcento('TERMO DE CONFIDENCIALIDADE E NAO DIVULGACAO'), pageWidth / 2, y, { align: 'center', maxWidth });
  y += 7;
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    semAcento('Parceria Comercial - Painel Digital Exclusivo do Parceiro | Versao ' + (dados.versao || VERSAO_TERMO)),
    pageWidth / 2, y, { align: 'center', maxWidth }
  );
  y += 12;

  texto(PREAMBULO);

  for (const secao of SECOES) {
    if (y > 252) { doc.addPage(); y = 20; }
    y += 4;
    texto(secao[0], 10.5, true, [10, 10, 11]);
    for (let i = 1; i < secao.length; i++) texto(secao[i]);
  }

  // Fecho
  if (y > 240) { doc.addPage(); y = 20; }
  y += 6;
  texto('E, por estar de pleno acordo, o RECEPTOR manifesta seu aceite aos termos acima, declarando ter lido, compreendido e concordado com a totalidade das clausulas deste instrumento, em especial a multa contratual prevista na Clausula 6.', 8.5, false, [100, 100, 100]);

  // Campos de assinatura
  if (y > 228) { doc.addPage(); y = 20; }
  y += 18;
  const colWidth = maxWidth / 2;

  if (dados.signature_base64) {
    try {
      doc.addImage(dados.signature_base64, 'PNG', margin + colWidth + 10, y - 16, 60, 15);
    } catch (e) { /* assinatura invalida nao invalida o termo */ }
  }

  doc.setDrawColor(100, 100, 100);
  doc.line(margin, y, margin + colWidth - 10, y);
  doc.line(margin + colWidth + 10, y, margin + colWidth * 2, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51);
  doc.text(semAcento('COMPRAS FULL COMERCIO LTDA (DIVULGADORA)'), margin, y + 5);
  doc.text(semAcento('RECEPTOR'), margin + colWidth + 10, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('CNPJ: 51.544.091/0001-67', margin, y + 9);
  doc.text(semAcento('Marca: Leilao NoZap'), margin, y + 13);
  doc.text(semAcento('Nome: ' + nome), margin + colWidth + 10, y + 9);
  doc.text('CPF/CNPJ: ' + cpf, margin + colWidth + 10, y + 13);
  y += 24;

  // 🔐 Bloco de autenticidade
  if (dados.assinado_em || dados.hash) {
    if (y > 222) { doc.addPage(); y = 20; }
    doc.setDrawColor(201, 165, 92);
    doc.rect(margin, y, maxWidth, 52);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(150, 115, 30);
    doc.text(semAcento('ASSINATURA ELETRONICA - REGISTRO DE AUTENTICIDADE'), margin + 3, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    const linhas = [
      'Assinado eletronicamente nos termos da Lei n. 14.063/2020 e da MP n. 2.200-2/2001.',
      'Signatario: ' + nome + '  |  CPF/CNPJ: ' + cpf + (dados.partner_email ? '  |  E-mail: ' + dados.partner_email : ''),
      'Data e hora (servidor): ' + (dados.assinado_em || '-'),
      'IP de origem: ' + (dados.ip || '-'),
      'Dispositivo: ' + String(dados.user_agent || '-').slice(0, 110),
      'Documento de identidade anexado: ' + (dados.doc_identidade_url ? 'SIM' : 'NAO'),
      'Comprovacao de CPF anexada: ' + (dados.doc_cpf_url ? 'SIM' : 'NAO'),
      'Versao do termo: ' + (dados.versao || VERSAO_TERMO),
      'Codigo de verificacao: ' + (dados.codigo_verificacao || '-'),
      'Hash SHA-256 do documento: ' + (dados.hash || '-'),
    ];
    for (const l of linhas) {
      doc.text(semAcento(l), margin + 3, y);
      y += 4.2;
    }
  } else {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(semAcento('Local e Data: _____/_____/_______'), pageWidth / 2, y, { align: 'center' });
  }

  return doc.output('datauristring').split(',')[1];
}