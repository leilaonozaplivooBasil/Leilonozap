import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      auction_id,
      auction_title,
      modelo,
      valor_maximo_autorizado,
      percentual_compartilhado,
      deposito_confirmado
    } = await req.json();

    // Taxa de operação fixa: 10% (por segunda ordem)
    const TAXA_OPERACAO_PERCENTUAL = 10;
    const valor_capital_liquido = valor_maximo_autorizado || 0;
    const valor_taxa_operacao = parseFloat((valor_capital_liquido * (TAXA_OPERACAO_PERCENTUAL / 100)).toFixed(2));

    if (!auction_id || !modelo || !valor_maximo_autorizado) {
      return Response.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Verificar se já existe autorização deste investidor para este lote
    const existing = await base44.asServiceRole.entities.LanceAutorizado.filter({
      investidor_id: user.id,
      auction_id: auction_id
    });

    let result;

    if (existing && existing.length > 0) {
      // Atualizar autorização existente
      result = await base44.asServiceRole.entities.LanceAutorizado.update(
        existing[0].id,
        {
          modelo,
          valor_maximo_autorizado,
          percentual_compartilhado: percentual_compartilhado || 0,
          taxa_operacao_percentual: TAXA_OPERACAO_PERCENTUAL,
          valor_taxa_operacao,
          valor_capital_liquido,
          deposito_confirmado: deposito_confirmado || 0,
          status_autorizacao: 'confirmada',
          data_autorizacao: new Date().toISOString()
        }
      );
    } else {
      // Criar nova autorização
      result = await base44.asServiceRole.entities.LanceAutorizado.create({
        investidor_id: user.id,
        investidor_email: user.email,
        investidor_nome: user.full_name,
        auction_id,
        auction_title,
        modelo,
        valor_maximo_autorizado,
        percentual_compartilhado: percentual_compartilhado || 0,
        taxa_operacao_percentual: TAXA_OPERACAO_PERCENTUAL,
        valor_taxa_operacao,
        valor_capital_liquido,
        deposito_confirmado: deposito_confirmado || 0,
        status_autorizacao: 'confirmada',
        data_autorizacao: new Date().toISOString()
      });
    }

    // Tenta alocar capital automaticamente (não-bloqueante: falha silenciosa se saldo insuficiente)
    let capital_alocado = false;
    try {
      const allocResult = await base44.functions.invoke('allocateInvestorCapital', {
        authorization_id: result.id
      });
      const allocData = allocResult?.data || allocResult;
      capital_alocado = allocData?.status === 'success' || allocData?.status === 'already_processed';
    } catch (allocErr) {
      // Não-bloqueante: autorização já foi salva com sucesso
      console.warn('Alocação automática não realizada:', allocErr.message);
    }

    return Response.json({
      status: 'success',
      message: 'Autorização persistida',
      authorization_id: result.id,
      investidor: user.full_name,
      auction_id,
      modelo,
      valor_autorizado: valor_maximo_autorizado,
      capital_alocado
    });

  } catch (error) {
    console.error('Erro ao persistir autorização:', error);
    return Response.json({ 
      error: error.message,
      status: 'error'
    }, { status: 500 });
  }
});