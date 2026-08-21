// 📄 Gerador do PDF do Contrato de Parceria Comercial (rota Vercel).
//
// CAUSA-RAIZ do "PDF não gerado" (06/08/2026): a função existia SÓ como função
// Deno (base44/functions/generateContractPDF) e funcionava lá. Mas o app no
// navegador manda toda chamada de servidor para /api/functions/<nome> (ver
// src/api/plataformaAdapter.js). Como não existia /api/functions/generateContractPDF,
// o adapter devolvia { ok:false, error:'not_implemented' }, o front não achava
// pdf_base64 e mostrava "PDF não gerado" — em Baixar E em Compartilhar.
//
// O texto do contrato é o MESMO da função Deno (fonte de verdade jurídica).
// Acentos são removidos porque a fonte padrão do jsPDF (helvetica) não tem
// suporte a UTF-8 e imprimiria caracteres quebrados.
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

// Cláusulas do contrato: ['titulo', ...paragrafos]
const SECOES = [
  ['1. DA QUALIFICACAO E DA ATIVIDADE DA PLATAFORMA',
    '1.1. A PLATAFORMA, razao social Compras Full Comercio LTDA, inscrita no CNPJ sob n. 51.544.091/0001-67, sob a marca LEILAO NOZAP, e uma empresa brasileira de tecnologia e operacao comercial especializada na aquisicao, curadoria e comercializacao de produtos de alto giro, oriundos de devolucoes dentro do prazo legal de 7 (sete) dias, estoques de fabrica, mostruarios e lotes de estoque parado, adquiridos com desconto de 25% a 40% sobre o valor de mercado, posteriormente comercializados por meio de equipe de vendas propria e canais digitais proprios.',
    '1.2. A PLATAFORMA opera com metodologia propria de curadoria, baseada em curva ABC, analise de liquidez, calculo de rentabilidade e gestao operacional integral, garantindo o giro comercial dos produtos adquiridos.'],
  ['2. DO OBJETO',
    '2.1. O presente contrato tem por objeto a formalizacao da parceria comercial entre a PLATAFORMA e o PARCEIRO, mediante a qual o PARCEIRO aporta capital para participacao no resultado financeiro das operacoes comerciais estruturadas de compra e venda de produtos realizadas pela PLATAFORMA, conforme condicoes aqui pactuadas.',
    '2.2. O capital aportado pelo PARCEIRO sera integralmente alocado em operacoes sucessivas de compra e recompra de produtos, dentro da estrategia operacional da PLATAFORMA, gerando resultados comerciais compartilhados nos termos deste instrumento.'],
  ['3. DA NATUREZA JURIDICA DA PARCERIA',
    '3.1. As partes declaram e reconhecem, de forma expressa e inequivoca, que a relacao ora formalizada possui natureza estritamente comercial, caracterizando-se como parceria comercial de participacao em operacao estruturada de venda de produtos.',
    '3.2. Em nenhuma hipotese este contrato podera ser interpretado como:',
    '- aplicacao financeira, investimento financeiro ou produto de renda fixa ou variavel;',
    '- captacao de recursos junto ao publico, nos termos da legislacao pertinente;',
    '- contrato de mutuo, emprestimo ou financiamento;',
    '- promessa de rendimento, taxa de juros ou remuneracao garantida sobre capital;',
    '- contrato de sociedade, joint venture ou associacao;',
    '- relacao de consumo sujeita ao Codigo de Defesa do Consumidor;',
    '- relacao de emprego ou trabalho subordinado;',
    '- oferta publica de valores mobiliarios nos termos da Lei n. 6.385/1976.',
    '3.3. O PARCEIRO declara estar ciente de que o resultado comercial compartilhado decorre exclusivamente do lucro liquido apurado nas operacoes de compra e venda de produtos realizadas pela PLATAFORMA, nao constituindo, sob qualquer aspecto, rendimento financeiro, remuneracao de capital ou taxa de juros.'],
  ['4. DA OPERACAO COMERCIAL ESTRUTURADA',
    '4.1. A operacao comercial estruturada consiste na aquisicao, pela PLATAFORMA, de produtos provenientes das seguintes origens:',
    '- produtos devolvidos dentro do prazo legal de 7 (sete) dias;',
    '- estoques de fabrica e produtos direto de fabrica;',
    '- mostruarios e amostras comerciais;',
    '- lotes de estoque parado ou excedente.',
    '4.2. A aquisicao e realizada com desconto de 25% a 40% sobre o valor de mercado dos produtos, garantindo margem operacional favoravel.',
    '4.3. Os produtos adquiridos sao posteriormente comercializados pela PLATAFORMA por meio de equipe de vendas propria e canais digitais, com giro comercial acelerado devido a alta liquidez dos itens selecionados.'],
  ['5. DA CURADORIA E SELECAO DE PRODUTOS',
    '5.1. A selecao dos produtos que compoem a operacao comercial e de competencia exclusiva da PLATAFORMA, baseada em metodologia propria de curva ABC, analise de liquidez, calculo de rentabilidade e gestao de risco operacional.',
    '5.2. O PARCEIRO nao participa, nao interfere e nao decide sobre a escolha dos produtos a serem adquiridos, cabendo a PLATAFORMA a definicao estrategica das operacoes comerciais.',
    '5.3. A PLATAFORMA mantera registro detalhado das operacoes realizadas, disponivel para consulta pelo PARCEIRO por meio de painel digital exclusivo.'],
  ['6. DO CAPITAL APORTADO E SUA ALOCACAO',
    '6.1. O PARCEIRO aportara o valor correspondente ao plano de parceria selecionado no momento da adesao, conforme condicoes apresentadas na plataforma.',
    '6.2. O capital aportado sera integralmente alocado em operacoes sucessivas de compra e recompra de produtos durante toda a vigencia deste contrato.',
    '6.3. O capital aportado nao podera ser retirado antecipadamente, ressalvadas as condicoes de encerramento previstas na Clausula 8.',
    '6.4. O aporte de capital podera ser realizado diretamente pela plataforma digital ou, apos a assinatura deste contrato, mediante transferencia bancaria ou PIX para os dados abaixo:',
    'Dados Bancarios para Aporte de Capital - Banco Santander, Agencia 0806, Conta Corrente 13.003234-4, CNPJ: 51.544.091/0001-67, Compras Full Comercio LTDA. Modalidade aceita: PIX ou Transferencia Bancaria.'],
  ['7. DO COMPARTILHAMENTO DE LUCROS',
    '7.1. Em contrapartida ao capital aportado, o PARCEIRO fara jus a uma cota de participacao sobre o lucro liquido apurado nas operacoes comerciais realizadas pela PLATAFORMA, calculada conforme percentual estabelecido no momento da adesao e aplicada sobre o valor do capital aportado.',
    '7.2. O lucro compartilhado decorre exclusivamente do resultado positivo das operacoes de compra e venda de produtos, nao constituindo rendimento financeiro, remuneracao de capital, taxa de juros ou qualquer modalidade de aplicacao financeira.',
    '7.3. O compartilhamento de lucros nao esta vinculado ao volume de vendas individuais do PARCEIRO, mas sim a execucao operacional global da PLATAFORMA, dentro de seu modelo de negocios.',
    '7.4. A PLATAFORMA compromete-se a disponibilizar, por meio do painel digital exclusivo, a prestacao de contas e o demonstrativo de resultados das operacoes comerciais realizadas.'],
  ['8. DA VIGENCIA E DO CICLO OPERACIONAL',
    '8.1. O presente contrato tera vigencia de 12 (doze) meses de repasses, contados a partir do primeiro compartilhamento de lucros, precedidos por um periodo de estruturacao de 30 (trinta) dias contados da data de aceite eletronico pelo PARCEIRO.',
    '8.2. O ciclo financeiro da parceria observara as seguintes regras:',
    'a) O periodo de estruturacao de 30 dias se divide em: 7 (sete) dias para chegada e recebimento do produto, 10 (dez) dias para catalogacao e organizacao do estoque, e 13 (treze) dias para colocacao a venda e apuracao do primeiro repasse;',
    'b) Apos o periodo de estruturacao, os compartilhamentos de lucro ocorrerao mensalmente, a cada 30 dias, ao longo dos 12 meses de vigencia;',
    'c) O capital permanecera alocado continuamente em novas operacoes enquanto vigente o contrato.',
    '8.3. Os valores de lucro compartilhado poderao ser retirados mensalmente pelo PARCEIRO, ate o termino da vigencia contratual.',
    '8.4. Ao final dos 12 (doze) meses de repasses, a parceria sera automaticamente encerrada, salvo manifestacao expressa das partes para novo acordo.',
    '8.5. Encerrada a vigencia contratual, o capital aportado sera disponibilizado para retirada em ate 30 (trinta) dias.'],
  ['9. DAS OBRIGACOES DO PARCEIRO',
    '9.1. Realizar o cadastro na plataforma com informacoes verdadeiras, completas e atualizadas;',
    '9.2. Aportar o capital correspondente ao plano de parceria selecionado;',
    '9.3. Acompanhar as informacoes disponibilizadas no painel digital exclusivo;',
    '9.4. Manter seus dados cadastrais, bancarios e de contato atualizados;',
    '9.5. Abster-se de interferir na selecao de produtos ou na gestao operacional da PLATAFORMA.'],
  ['10. DAS OBRIGACOES DA PLATAFORMA',
    '10.1. Alocar o capital aportado em operacoes comerciais de compra e venda de produtos;',
    '10.2. Realizar a curadoria, selecao e aquisicao dos produtos com criterios tecnicos rigorosos;',
    '10.3. Operar a logistica, armazenamento e comercializacao dos produtos;',
    '10.4. Garantir transparencia total por meio do painel digital exclusivo;',
    '10.5. Efetuar o compartilhamento de lucros e a devolucao do capital aportado nos prazos estabelecidos.'],
  ['11. DOS RISCOS OPERACIONAIS',
    '11.1. A PLATAFORMA adota criterios rigorosos de selecao, controle e gestao, com o objetivo de mitigar riscos operacionais.',
    '11.2. O PARCEIRO declara estar ciente de que toda operacao comercial envolve variaveis de mercado, logistica e fornecedores, podendo o resultado operacional sofrer oscilacoes.',
    '11.3. A PLATAFORMA compromete-se a atuar com diligencia maxima, transparencia e boa-fe objetiva em todas as etapas da operacao.'],
  ['12. DA CONFIDENCIALIDADE',
    '12.1. As partes comprometem-se a manter sigilo absoluto sobre todas as informacoes estrategicas, comerciais, operacionais e financeiras a que tiverem acesso em decorrencia deste contrato, obrigacao que subsistira pelo prazo de 5 (cinco) anos contados do encerramento da vigencia contratual.'],
  ['13. DAS DISPOSICOES GERAIS',
    '13.1. O presente contrato podera ser firmado por aceite eletronico, mediante marcacao de checkbox ou clique em botao de confirmacao na plataforma, nos termos da Lei n. 14.063/2020 e da Medida Provisoria n. 2.200-2/2001, ou por assinatura manual, mediante aposicao da assinatura de proprio punho nos campos abaixo, sendo ambas as modalidades igualmente validas e eficazes.',
    '13.2. Este contrato representa a totalidade do acordo entre as partes, prevalecendo sobre quaisquer negociacoes, declaracoes ou entendimentos previos, verbais ou escritos.',
    '13.3. Qualquer modificacao deste contrato devera ser formalizada por meio de termo aditivo, com aceite eletronico do PARCEIRO.',
    '13.4. A tolerancia de qualquer das partes em exigir o cumprimento de qualquer clausula deste contrato nao sera considerada renuncia ou novacao.',
    '13.5. Caso qualquer clausula deste contrato seja declarada nula ou inexequivel, as demais clausulas permanecerao plenamente validas e eficazes.'],
  ['14. DO FORO',
    '14.1. Fica eleito o foro da comarca do Rio de Janeiro/RJ, com renuncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer questoes oriundas ou relacionadas ao presente contrato.'],
];

// 🗓️ Versão do contrato. Subiu em 06/08/2026-b: Cláusulas 8.2 "a" e 8.3 passaram
// de 60 para 30 dias (ciclo real: 10 dias operacionais + 20 de giro), alinhando o
// contrato ao painel do parceiro. Assinaturas anteriores seguem vinculadas à
// versão gravada no próprio registro (hash + versao), não a esta constante.
// 🗓️ Versão subiu em 10/08/2026: Clausula 6 (nova conta bancaria Ag 0806/CC
// 13.003234-4 + aporte via transferencia apos assinatura) e Clausula 8 (12
// meses de repasses APOS 30 dias de estruturacao 7+10+13, e capital liberado
// em 30 dias ao final). Assinaturas anteriores seguem vinculadas à versão
// gravada no próprio registro (hash + versao), não a esta constante.
export const VERSAO_CONTRATO = '2026-08-10';

/**
 * Gera o PDF do contrato.
 * @param {object} dados
 *  - partner_name, partner_cpf, partner_email
 *  - plan_name, plan_amount
 *  - assinado_em (ISO), ip, user_agent
 *  - hash, codigo_verificacao
 *  - signature_base64 (dataURL PNG da assinatura desenhada)
 * @returns {string} PDF em base64 puro (sem prefixo data:)
 */
export function gerarContratoPdfBase64(dados = {}) {
  const nome = dados.partner_name || '____________________';
  const cpf = dados.partner_cpf || '____________________';
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 18;

  const texto = (t, size = 10, bold = false, cor = [51, 51, 51]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(cor[0], cor[1], cor[2]);
    for (const linha of doc.splitTextToSize(semAcento(t), maxWidth)) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(linha, margin, y);
      y += size * 0.5;
    }
    y += 3;
  };

  // Cabeçalho
  doc.setFillColor(34, 139, 34);
  doc.rect(pageWidth / 2 - 27, y, 54, 14, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('LEILAO NOZAP', pageWidth / 2, y + 9, { align: 'center' });
  y += 24;

  doc.setFontSize(13);
  doc.setTextColor(34, 139, 34);
  doc.text(
    semAcento('CONTRATO DE PARCERIA COMERCIAL E PARTICIPACAO EM OPERACAO ESTRUTURADA DE VENDA DE PRODUTOS'),
    pageWidth / 2, y, { align: 'center', maxWidth }
  );
  y += 14;

  texto('Pelo presente instrumento particular, de um lado COMPRAS FULL COMERCIO LTDA, pessoa juridica de direito privado, inscrita no CNPJ sob n. 51.544.091/0001-67, com sede em Av. das Americas, 19.005, Torre 1, Sala 1106, Barra da Tijuca, Rio de Janeiro - RJ, 22790-704, neste ato representada por sua marca LEILAO NOZAP, doravante denominada simplesmente PLATAFORMA, e de outro lado ' + nome + ', CPF/CNPJ ' + cpf + ', doravante denominado simplesmente PARCEIRO, resolvem celebrar o presente Contrato de Parceria Comercial e Participacao em Operacao Estruturada de Venda de Produtos, que se regera pelas clausulas e condicoes a seguir estabelecidas.');

  // Qualificação do aporte (quando o plano é conhecido)
  if (dados.plan_name) {
    y += 2;
    texto('PLANO CONTRATADO: ' + dados.plan_name, 10, true, [34, 139, 34]);
    if (dados.plan_amount) {
      texto('CAPITAL DO APORTE: R$ ' + Number(dados.plan_amount).toLocaleString('pt-BR'), 10, true, [51, 51, 51]);
    }
  }

  for (const secao of SECOES) {
    if (y > 250) { doc.addPage(); y = 20; }
    y += 5;
    texto(secao[0], 11, true, [34, 139, 34]);
    for (let i = 1; i < secao.length; i++) texto(secao[i]);
  }

  // Fecho
  if (y > 235) { doc.addPage(); y = 20; }
  y += 8;
  texto('E, por estarem de pleno acordo, as partes manifestam seu aceite aos termos acima, seja por meio eletronico ou por assinatura manual, declarando ter lido, compreendido e concordado com a totalidade das clausulas deste instrumento.', 9, false, [100, 100, 100]);

  // Campos de assinatura
  if (y > 225) { doc.addPage(); y = 20; }
  y += 18;
  const colWidth = maxWidth / 2;

  // Assinatura desenhada do parceiro (se houver) acima da linha
  if (dados.signature_base64) {
    try {
      doc.addImage(dados.signature_base64, 'PNG', margin + colWidth + 10, y - 16, 60, 15);
    } catch (e) { /* assinatura invalida nao impede o contrato */ }
  }

  doc.setDrawColor(100, 100, 100);
  doc.line(margin, y, margin + colWidth - 10, y);
  doc.line(margin + colWidth + 10, y, margin + colWidth * 2, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51);
  doc.text(semAcento('COMPRAS FULL COMERCIO LTDA'), margin, y + 5);
  doc.text(semAcento('PARCEIRO COMERCIAL'), margin + colWidth + 10, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('CNPJ: 51.544.091/0001-67', margin, y + 9);
  doc.text(semAcento('Marca: Leilao NoZap'), margin, y + 13);
  doc.text(semAcento('Nome: ' + nome), margin + colWidth + 10, y + 9);
  doc.text('CPF/CNPJ: ' + cpf, margin + colWidth + 10, y + 13);
  y += 24;

  // 🔐 Bloco de validade jurídica do aceite eletrônico
  if (dados.assinado_em || dados.hash) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setDrawColor(34, 139, 34);
    doc.rect(margin, y, maxWidth, 44);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 139, 34);
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
      'Versao do contrato: ' + (dados.versao || VERSAO_CONTRATO),
      'Codigo de verificacao: ' + (dados.codigo_verificacao || '-'),
      'Hash SHA-256 do documento: ' + (dados.hash || '-'),
    ];
    for (const l of linhas) {
      doc.text(semAcento(l), margin + 3, y);
      y += 4.2;
    }
    y += 6;
  } else {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(semAcento('Local e Data: _____/_____/_______'), pageWidth / 2, y, { align: 'center' });
  }

  // saída base64 pura (o front adiciona/remove o prefixo conforme precisa)
  return doc.output('datauristring').split(',')[1];
}