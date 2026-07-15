import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { jsPDF } from 'npm:jspdf@2.5.1';

// Funcao para remover acentos e caracteres especiais
function removeAccents(str) {
  const accentsMap = {
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c', 'ñ': 'n',
    'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
    'Ç': 'C', 'Ñ': 'N',
    'º': 'o', 'ª': 'a'
  };
  return str.split('').map(char => accentsMap[char] || char).join('');
}

Deno.serve(async (req) => {
  try {
    // Contract PDF is public — no auth required
    // Parse partner info from request body
    let partnerName = '____________________';
    let partnerCpf = '____________________';
    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.partner_name) partnerName = body.partner_name;
      if (body?.partner_cpf) partnerCpf = body.partner_cpf;
    } catch (e) {}

    // Buscar a logo como base64
    let logoBase64 = null;
    try {
      const logoUrl = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png';
      const logoResponse = await fetch(logoUrl);
      if (logoResponse.ok) {
        const logoBuffer = await logoResponse.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(logoBuffer)));
        logoBase64 = 'data:image/png;base64,' + base64;
      }
    } catch (e) {
      console.log('Erro ao carregar logo:', e);
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let y = 15;

    // Helper function to add text with word wrap (sem acentos)
    const addText = (text, fontSize = 10, isBold = false, color = [51, 51, 51]) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setTextColor(color[0], color[1], color[2]);
      
      const cleanText = removeAccents(text);
      const lines = doc.splitTextToSize(cleanText, maxWidth);
      
      for (const line of lines) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += fontSize * 0.5;
      }
      y += 3;
    };

    const addTitle = (text) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      y += 5;
      addText(text, 11, true, [34, 139, 34]);
    };

    // Header com logo real
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', pageWidth/2 - 25, y, 50, 50);
      y += 58;
    } else {
      // Fallback: retangulo verde com texto
      doc.setFillColor(34, 139, 34);
      doc.rect(pageWidth/2 - 25, y, 50, 15, 'F');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('LEILAO NOZAP', pageWidth/2, y + 10, { align: 'center' });
      y += 25;
    }

    // Title
    doc.setFontSize(13);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text(removeAccents('CONTRATO DE PARCERIA COMERCIAL E PARTICIPACAO EM OPERACAO ESTRUTURADA DE VENDA DE PRODUTOS'), pageWidth/2, y, { align: 'center', maxWidth: maxWidth });
    y += 12;

    // Introduction
    addText('Pelo presente instrumento particular, de um lado COMPRAS FULL COMERCIO LTDA, pessoa juridica de direito privado, inscrita no CNPJ sob n. 51.544.091/0001-67, com sede em Av. das Americas, 19.005, Torre 1, Sala 1106, Barra da Tijuca, Rio de Janeiro - RJ, 22790-704, neste ato representada por sua marca LEILAO NOZAP, doravante denominada simplesmente PLATAFORMA, e de outro lado PARCEIRO COMERCIAL, pessoa fisica ou juridica devidamente cadastrada na plataforma, doravante denominado simplesmente PARCEIRO, resolvem celebrar o presente Contrato de Parceria Comercial e Participacao em Operacao Estruturada de Venda de Produtos, que se regera pelas clausulas e condicoes a seguir estabelecidas.');

    // Section 1
    addTitle('1. DA QUALIFICACAO E DA ATIVIDADE DA PLATAFORMA');
    addText('1.1. A PLATAFORMA, razao social Compras Full Comercio LTDA, inscrita no CNPJ sob n. 51.544.091/0001-67, sob a marca LEILAO NOZAP, e uma empresa brasileira de tecnologia e operacao comercial especializada na aquisicao, curadoria e comercializacao de produtos de alto giro, oriundos de devolucoes dentro do prazo legal de 7 (sete) dias, estoques de fabrica, mostruarios e lotes de estoque parado, adquiridos com desconto de 25% (vinte e cinco por cento) a 40% (quarenta por cento) sobre o valor de mercado, posteriormente comercializados por meio de equipe de vendas propria e canais digitais proprios.');
    addText('1.2. A PLATAFORMA opera com metodologia propria de curadoria, baseada em curva ABC, analise de liquidez, calculo de rentabilidade e gestao operacional integral, garantindo o giro comercial dos produtos adquiridos.');

    // Section 2
    addTitle('2. DO OBJETO');
    addText('2.1. O presente contrato tem por objeto a formalizacao da parceria comercial entre a PLATAFORMA e o PARCEIRO, mediante a qual o PARCEIRO aporta capital para participacao no resultado financeiro das operacoes comerciais estruturadas de compra e venda de produtos realizadas pela PLATAFORMA, conforme condicoes aqui pactuadas.');
    addText('2.2. O capital aportado pelo PARCEIRO sera integralmente alocado em operacoes sucessivas de compra e recompra de produtos, dentro da estrategia operacional da PLATAFORMA, gerando resultados comerciais compartilhados nos termos deste instrumento.');

    // Section 3
    addTitle('3. DA NATUREZA JURIDICA DA PARCERIA');
    addText('3.1. As partes declaram e reconhecem, de forma expressa e inequivoca, que a relacao ora formalizada possui natureza estritamente comercial, caracterizando-se como parceria comercial de participacao em operacao estruturada de venda de produtos.');
    addText('3.2. Em nenhuma hipotese este contrato podera ser interpretado como:');
    addText('- aplicacao financeira, investimento financeiro ou produto de renda fixa ou variavel;');
    addText('- captacao de recursos junto ao publico, nos termos da legislacao pertinente;');
    addText('- contrato de mutuo, emprestimo ou financiamento;');
    addText('- promessa de rendimento, taxa de juros ou remuneracao garantida sobre capital;');
    addText('- contrato de sociedade, joint venture ou associacao;');
    addText('- relacao de consumo sujeita ao Codigo de Defesa do Consumidor;');
    addText('- relacao de emprego ou trabalho subordinado;');
    addText('- oferta publica de valores mobiliarios nos termos da Lei n. 6.385/1976.');
    addText('3.3. O PARCEIRO declara estar ciente de que o resultado comercial compartilhado decorre exclusivamente do lucro liquido apurado nas operacoes de compra e venda de produtos realizadas pela PLATAFORMA, nao constituindo, sob qualquer aspecto, rendimento financeiro, remuneracao de capital ou taxa de juros.');

    // Section 4
    addTitle('4. DA OPERACAO COMERCIAL ESTRUTURADA');
    addText('4.1. A operacao comercial estruturada consiste na aquisicao, pela PLATAFORMA, de produtos provenientes das seguintes origens:');
    addText('- produtos devolvidos dentro do prazo legal de 7 (sete) dias;');
    addText('- estoques de fabrica e produtos direto de fabrica;');
    addText('- mostruarios e amostras comerciais;');
    addText('- lotes de estoque parado ou excedente.');
    addText('4.2. A aquisicao e realizada com desconto de 25% (vinte e cinco por cento) a 40% (quarenta por cento) sobre o valor de mercado dos produtos, garantindo margem operacional favoravel.');
    addText('4.3. Os produtos adquiridos sao posteriormente comercializados pela PLATAFORMA por meio de equipe de vendas propria e canais digitais, com giro comercial acelerado devido a alta liquidez dos itens selecionados.');

    // Section 5
    addTitle('5. DA CURADORIA E SELECAO DE PRODUTOS');
    addText('5.1. A selecao dos produtos que compoem a operacao comercial e de competencia exclusiva da PLATAFORMA, baseada em metodologia propria de curva ABC, analise de liquidez, calculo de rentabilidade e gestao de risco operacional.');
    addText('5.2. O PARCEIRO nao participa, nao interfere e nao decide sobre a escolha dos produtos a serem adquiridos, cabendo a PLATAFORMA a definicao estrategica das operacoes comerciais.');
    addText('5.3. A PLATAFORMA manterá registro detalhado das operacoes realizadas, disponivel para consulta pelo PARCEIRO por meio de painel digital exclusivo.');

    // Section 6
    addTitle('6. DO CAPITAL APORTADO E SUA ALOCACAO');
    addText('6.1. O PARCEIRO aportara o valor correspondente ao plano de parceria selecionado no momento da adesao, conforme condicoes apresentadas na plataforma.');
    addText('6.2. O capital aportado sera integralmente alocado em operacoes sucessivas de compra e recompra de produtos, dentro da estrategia operacional da PLATAFORMA, durante toda a vigencia deste contrato.');
    addText('6.3. O capital aportado nao podera ser retirado antecipadamente, ressalvadas as condicoes de encerramento previstas na Clausula 8.');
    addText('6.4. O aporte de capital devera ser realizado via PIX ou transferencia bancaria para a conta da PLATAFORMA: Banco Santander, Agencia 0142, Conta Corrente 1030358-7, CNPJ 51.544.091/0001-67, em nome de Compras Full Comercio LTDA.');

    // Section 7
    addTitle('7. DO COMPARTILHAMENTO DE LUCROS');
    addText('7.1. Em contrapartida ao capital aportado, o PARCEIRO fara jus a uma cota de participacao sobre o lucro liquido apurado nas operacoes comerciais realizadas pela PLATAFORMA, calculada conforme percentual estabelecido no momento da adesao e aplicada sobre o valor do capital aportado.');
    addText('7.2. O lucro compartilhado decorre exclusivamente do resultado positivo das operacoes de compra e venda de produtos, nao constituindo rendimento financeiro, remuneracao de capital, taxa de juros ou qualquer modalidade de aplicacao financeira.');
    addText('7.3. O compartilhamento de lucros nao esta vinculado ao volume de vendas individuais do PARCEIRO, mas sim a execucao operacional global da PLATAFORMA, dentro de seu modelo de negocios.');
    addText('7.4. A PLATAFORMA compromete-se a disponibilizar, por meio do painel digital exclusivo, a prestacao de contas e o demonstrativo de resultados das operacoes comerciais realizadas.');

    // Section 8
    addTitle('8. DA VIGENCIA E DO CICLO OPERACIONAL');
    addText('8.1. O presente contrato tera vigencia de 12 (doze) meses, contados a partir da data de aceite eletronico pelo PARCEIRO.');
    addText('8.2. O ciclo financeiro da parceria observara as seguintes regras:');
    addText('a) O primeiro compartilhamento de lucros sera disponibilizado ao PARCEIRO em ate 60 (sessenta) dias contados da data do aporte inicial, prazo necessario para os 15 (quinze) primeiros dias destinados a testes, disponibilizacao e colocacao a venda dos produtos na plataforma, seguidos de 45 (quarenta e cinco) dias para o giro do capital de forma sadia e acelerada, garantindo previsibilidade e seguranca da operacao;');
    addText('b) Apos o primeiro ciclo, os compartilhamentos subsequentes ocorrerao em ciclos mensais, com disponibilizacao a cada 30 (trinta) dias;');
    addText('c) O capital aportado permanecera alocado continuamente em novas operacoes de compra e recompra de produtos, enquanto vigente o contrato.');
    addText('8.3. Os valores de lucro compartilhado, apurados apos o periodo inicial de 60 (sessenta) dias, poderao ser retirados mensalmente pelo PARCEIRO, ate o termino da vigencia contratual.');
    addText('8.4. Ao final do prazo de 12 (doze) meses, a parceria sera automaticamente encerrada, salvo manifestacao expressa das partes para celebracao de novo acordo, o qual podera conter condicoes, prazos e criterios distintos.');
    addText('8.5. Encerrada a vigencia contratual, o valor integral correspondente ao capital aportado pelo PARCEIRO sera disponibilizado para retirada em ate 30 (trinta) dias, contados da data formal de encerramento do contrato, respeitados os ciclos operacionais e financeiros em andamento.');

    // Section 9
    addTitle('9. DAS OBRIGACOES DO PARCEIRO');
    addText('9.1. Realizar o cadastro na plataforma com informacoes verdadeiras, completas e atualizadas;');
    addText('9.2. Aportar o capital correspondente ao plano de parceria selecionado;');
    addText('9.3. Acompanhar as informacoes disponibilizadas no painel digital exclusivo;');
    addText('9.4. Manter seus dados cadastrais, bancarios e de contato atualizados;');
    addText('9.5. Abster-se de interferir na selecao de produtos ou na gestao operacional da PLATAFORMA.');

    // Section 10
    addTitle('10. DAS OBRIGACOES DA PLATAFORMA');
    addText('10.1. Alocar o capital aportado em operacoes comerciais de compra e venda de produtos;');
    addText('10.2. Realizar a curadoria, selecao e aquisicao dos produtos com criterios tecnicos rigorosos;');
    addText('10.3. Operar a logistica, armazenamento e comercializacao dos produtos;');
    addText('10.4. Garantir transparencia total por meio do painel digital exclusivo;');
    addText('10.5. Efetuar o compartilhamento de lucros e a devolucao do capital aportado nos prazos estabelecidos.');

    // Section 11
    addTitle('11. DOS RISCOS OPERACIONAIS');
    addText('11.1. A PLATAFORMA adota criterios rigorosos de selecao, controle e gestao, com o objetivo de mitigar riscos operacionais.');
    addText('11.2. O PARCEIRO declara estar ciente de que toda operacao comercial envolve variaveis de mercado, logistica e fornecedores, podendo o resultado operacional sofrer oscilacoes.');
    addText('11.3. A PLATAFORMA compromete-se a atuar com diligencia maxima, transparencia e boa-fe objetiva em todas as etapas da operacao.');

    // Section 12
    addTitle('12. DA CONFIDENCIALIDADE');
    addText('12.1. As partes comprometem-se a manter sigilo absoluto sobre todas as informacoes estrategicas, comerciais, operacionais e financeiras a que tiverem acesso em decorrencia deste contrato, obrigacao que subsistira pelo prazo de 5 (cinco) anos contados do encerramento da vigencia contratual.');

    // Section 13
    addTitle('13. DAS DISPOSICOES GERAIS');
    addText('13.1. O presente contrato podera ser firmado por aceite eletronico, mediante marcacao de checkbox ou clique em botao de confirmacao na plataforma, nos termos da Lei n. 14.063/2020 e da Medida Provisoria n. 2.200-2/2001, ou por assinatura manual, mediante aposicao da assinatura de proprio punho nos campos abaixo, sendo ambas as modalidades igualmente validas e eficazes.');
    addText('13.2. Este contrato representa a totalidade do acordo entre as partes, prevalecendo sobre quaisquer negociacoes, declaracoes ou entendimentos previos, verbais ou escritos.');
    addText('13.3. Qualquer modificacao deste contrato devera ser formalizada por meio de termo aditivo, com aceite eletronico do PARCEIRO.');
    addText('13.4. A tolerancia de qualquer das partes em exigir o cumprimento de qualquer clausula deste contrato nao sera considerada renuncia ou novacao.');
    addText('13.5. Caso qualquer clausula deste contrato seja declarada nula ou inexequivel, as demais clausulas permanecerao plenamente validas e eficazes.');

    // Section 14
    addTitle('14. DO FORO');
    addText('14.1. Fica eleito o foro da comarca do Rio de Janeiro/RJ, com renuncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer questoes oriundas ou relacionadas ao presente contrato.');

    // Final
    y += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const finalText = 'E, por estarem de pleno acordo, as partes manifestam seu aceite aos termos acima, seja por meio eletronico ou por assinatura manual, declarando ter lido, compreendido e concordado com a totalidade das clausulas deste instrumento.';
    const finalLines = doc.splitTextToSize(removeAccents(finalText), maxWidth);
    for (const line of finalLines) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.text(line, pageWidth/2, y, { align: 'center' });
      y += 5;
    }

    // Signature fields
    y += 25;
    const colWidth = (pageWidth - margin * 2) / 2;

    // Platform signature (left)
    doc.setDrawColor(100, 100, 100);
    doc.line(margin, y, margin + colWidth - 10, y);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text(removeAccents('COMPRAS FULL COMERCIO LTDA'), margin, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('CNPJ: 51.544.091/0001-67', margin, y + 9);
    doc.text(removeAccents('Marca: Leilao NoZap'), margin, y + 13);

    // Partner signature (right)
    doc.setDrawColor(100, 100, 100);
    doc.line(margin + colWidth + 10, y, margin + colWidth * 2, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text(removeAccents('PARCEIRO COMERCIAL'), margin + colWidth + 10, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(removeAccents('Nome: ' + partnerName), margin + colWidth + 10, y + 9);
    doc.text('CPF/CNPJ: ' + partnerCpf, margin + colWidth + 10, y + 13);

    // Date
    y += 25;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(removeAccents('Local e Data: _____/_____/_______'), pageWidth/2, y, { align: 'center' });

    // Check if client wants base64 (for mobile)
    let wantsBase64 = false;
    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.format === 'base64') {
        wantsBase64 = true;
      }
    } catch (e) {}
    
    // Also check URL params
    try {
      const url = new URL(req.url);
      if (url.searchParams.get('format') === 'base64') {
        wantsBase64 = true;
      }
    } catch (e) {}
    
    if (wantsBase64) {
      // Generate PDF as base64 for better mobile compatibility
      const pdfBase64 = doc.output('datauristring');
      return Response.json({ 
        success: true,
        pdf_base64: pdfBase64,
        filename: 'Contrato_Parceria_LeilaoNoZap.pdf'
      });
    }

    // Generate PDF as arraybuffer for desktop
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="Contrato_Parceria_LeilaoNoZap.pdf"',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});