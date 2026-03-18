import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
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
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar a logo como base64
    let logoBase64 = null;
    try {
      const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/b6c1c0177_LogoLeiloNoZap.PNG';
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
    doc.setFontSize(14);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text(removeAccents('CONTRATO DE PARCERIA DE COMPRA E OPERACAO COMERCIAL'), pageWidth/2, y, { align: 'center' });
    y += 15;

    // Introduction
    addText('Pelo presente instrumento particular, de um lado LEILAO NOZAP, pessoa juridica de direito privado, inscrita no CNPJ sob n. 51.544.091/0001-67, com sede em Av. das Americas, 3500 - Barra da Tijuca, Rio de Janeiro - RJ, 22640-102, doravante denominada PLATAFORMA, e de outro lado PARCEIRO DE COMPRA, pessoa fisica ou juridica devidamente cadastrada na plataforma, doravante denominado simplesmente PARCEIRO, resolvem celebrar o presente Contrato de Parceria de Compra e Operacao Comercial, que se regera pelas clausulas e condicoes abaixo.');

    // Section 1
    addTitle('1. OBJETO');
    addText('1.1. O presente contrato tem por objeto a formalizacao da parceria comercial entre a PLATAFORMA e o PARCEIRO para a aquisicao de produtos selecionados, disponibilizados no catalogo digital da PLATAFORMA, com finalidade de operacoes comerciais estruturadas, sob gestao integral da PLATAFORMA.');
    addText('1.2. O PARCEIRO participa das operacoes por meio da compra de produtos, os quais sao destinados a comercializacao conforme a estrategia operacional da PLATAFORMA.');

    // Section 2
    addTitle('2. NATUREZA DA PARCERIA');
    addText('2.1. As partes reconhecem que esta relacao possui natureza estritamente comercial, nao caracterizando, em nenhuma hipotese:');
    addText('- investimento financeiro;');
    addText('- contrato de investimento coletivo;');
    addText('- sociedade;');
    addText('- joint venture;');
    addText('- relacao trabalhista;');
    addText('- captacao publica de recursos;');
    addText('- promessa de rendimento financeiro.');
    addText('2.2. O PARCEIRO atua como parceiro comercial de compra, participando de operacoes reais de circulacao de mercadorias.');

    // Section 3
    addTitle('3. FUNCIONAMENTO DA PARCERIA');
    addText('3.1. O PARCEIRO selecionara produtos disponiveis no catalogo da PLATAFORMA e realizara a compra minima definida no momento da adesao.');
    addText('3.2. A PLATAFORMA sera responsavel por:');
    addText('- curadoria e selecao dos produtos;');
    addText('- validacao de qualidade e procedencia;');
    addText('- gestao comercial e logistica;');
    addText('- acompanhamento operacional via painel digital;');
    addText('- comercializacao dos produtos nos canais proprios.');
    addText('3.3. O PARCEIRO podera acompanhar, em tempo real, por meio do painel exclusivo: status das operacoes; evolucao comercial; valores a receber; historico das compras realizadas.');

    // Section 4
    addTitle('4. RETORNO COMERCIAL AO PARCEIRO');
    addText('4.1. Em contrapartida a compra realizada, o PARCEIRO fara jus a um retorno comercial previamente estabelecido, calculado sobre o valor da compra, conforme condicoes apresentadas no momento da adesao.');
    addText('4.2. O retorno comercial nao esta vinculado a volume de vendas individuais do PARCEIRO, mas sim a execucao operacional da PLATAFORMA, dentro de seu modelo de negocios.');
    addText('4.3. O prazo estimado para encerramento da operacao e disponibilizacao do retorno sera informado no painel, respeitando o ciclo comercial de cada produto.');

    // Section 5
    addTitle('5. PAGAMENTOS');
    addText('5.1. Os pagamentos ao PARCEIRO ocorrerao por meio eletronico, em conta de titularidade do PARCEIRO, conforme dados cadastrados.');
    addText('5.2. Os valores serao liberados apos a conclusao do ciclo operacional correspondente a compra realizada.');

    // Section 6
    addTitle('6. RISCOS OPERACIONAIS');
    addText('6.1. A PLATAFORMA adota criterios rigorosos de selecao, controle e gestao, reduzindo riscos operacionais.');
    addText('6.2. Ainda assim, o PARCEIRO declara estar ciente de que toda operacao comercial envolve variaveis de mercado, logistica e fornecedores.');
    addText('6.3. A PLATAFORMA compromete-se a atuar com diligencia maxima, transparencia e boa-fe.');

    // Section 7
    addTitle('7. OBRIGACOES DO PARCEIRO');
    addText('7.1. Realizar o cadastro com informacoes verdadeiras;');
    addText('7.2. Efetuar as compras conforme as regras da plataforma;');
    addText('7.3. Acompanhar as informacoes disponibilizadas no painel;');
    addText('7.4. Manter seus dados atualizados.');

    // Section 8
    addTitle('8. OBRIGACOES DA PLATAFORMA');
    addText('8.1. Disponibilizar produtos de alta liquidez;');
    addText('8.2. Operar a logistica e comercializacao;');
    addText('8.3. Garantir transparencia total via painel;');
    addText('8.4. Efetuar os repasses conforme estabelecido.');

    // Section 9
    addTitle('9. VIGENCIA, PRAZO E CICLO OPERACIONAL');
    addText('9.1. O presente contrato tera vigencia de 12 (doze) meses, contados a partir da data de aceite eletronico pelo PARCEIRO.');
    addText('9.2. Durante a vigencia, o valor correspondente ao plano de parceria adquirido pelo PARCEIRO sera integralmente alocado em operacoes sucessivas de compra e recompra de produtos, dentro da estrategia operacional da PLATAFORMA.');
    addText('9.3. O ciclo financeiro da parceria observara as seguintes regras:');
    addText('a) O primeiro retorno comercial sera disponibilizado ao PARCEIRO em ate 60 (sessenta) dias contados da data da compra inicial;');
    addText('b) Apos o primeiro ciclo, os retornos subsequentes ocorrerao em ciclos mensais, com disponibilizacao a cada 30 (trinta) dias;');
    addText('c) O valor principal do plano adquirido permanecera reaplicado continuamente em novas operacoes de compra, enquanto vigente o contrato.');
    addText('9.4. Os valores de retorno comercial apurados apos o periodo inicial de 60 (sessenta) dias poderao ser sacados mensalmente pelo PARCEIRO, ate o termino da vigencia contratual.');
    addText('9.5. Ao final do prazo de 12 (doze) meses, a parceria sera automaticamente encerrada, salvo manifestacao expressa das partes para celebracao de novo acordo, o qual podera conter condicoes, prazos e criterios distintos.');
    addText('9.6. Encerrada a vigencia contratual, o valor integral correspondente a compra realizada pelo PARCEIRO sera disponibilizado para saque em ate 60 (sessenta) dias, contados da data formal de encerramento do contrato, respeitados os ciclos operacionais e financeiros em andamento.');

    // Section 10
    addTitle('10. CONFIDENCIALIDADE');
    addText('10.1. As partes comprometem-se a manter sigilo absoluto sobre informacoes estrategicas, comerciais e operacionais.');

    // Section 11
    addTitle('11. DISPOSICOES GERAIS');
    addText('11.1. O aceite eletronico deste contrato possui plena validade juridica.');
    addText('11.2. Este contrato representa a totalidade do acordo entre as partes.');

    // Section 12
    addTitle('12. FORO');
    addText('12.1. Fica eleito o foro da comarca do Rio de Janeiro/RJ para dirimir quaisquer questoes oriundas deste contrato.');

    // Final
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const finalText = 'E, por estarem de pleno acordo, o PARCEIRO manifesta seu aceite eletronico aos termos acima.';
    doc.text(finalText, pageWidth/2, y, { align: 'center', maxWidth: maxWidth });

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