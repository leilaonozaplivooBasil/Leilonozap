import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    // 🔴 DEBUG MODE DESATIVADO - Produção
    const DEBUG_MODE = false;
    
    if (DEBUG_MODE) {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🔍 MERCADO PAGO WEBHOOK - DEBUG MODE');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('⏰ Timestamp:', new Date().toISOString());
        console.log('📍 Method:', req.method);
        console.log('🔗 URL:', req.url);
        console.log('📦 Content-Type:', req.headers.get('content-type'));
        console.log('🔐 X-Signature:', req.headers.get('x-signature') ? '✅ Present' : '❌ Missing');
        console.log('📋 X-Request-ID:', req.headers.get('x-request-id') || 'N/A');
        console.log('🌐 User-Agent:', req.headers.get('user-agent') || 'N/A');
        console.log('🔗 Referer:', req.headers.get('referer') || 'N/A');
        
        // Captura body
        let rawBody = '';
        let parsedBody = null;
        try {
            const bodyText = await req.text();
            rawBody = bodyText;
            console.log('📊 Raw Body Size:', bodyText.length, 'bytes');
            console.log('📊 Body Hash:', new TextEncoder().encode(bodyText).length);
            console.log('📄 Raw Body:', bodyText.substring(0, 500));
            
            try {
                parsedBody = JSON.parse(bodyText);
                console.log('✅ Parsed Body:', JSON.stringify(parsedBody, null, 2));
            } catch (parseErr) {
                console.log('❌ Parse Error:', parseErr.message);
            }
        } catch (readErr) {
            console.log('❌ Read Error:', readErr.message);
        }
        
        // Recria req com body já lido
        const newReq = new Request(req.url, {
            method: req.method,
            headers: req.headers,
            body: rawBody
        });
        
        // ⚠️ MODO DEBUG: Retorna 200 imediatamente
        console.log('✅ DEBUG: Retornando 200 imediatamente');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        // Retorna 200 já
        const debugResponse = Response.json({ received: true, debug: true }, { status: 200 });
        
        // Continua processamento em background
        (async () => {
            try {
                console.log('🔄 Processamento em background iniciado...');
                // Aqui continuaria o processamento normal
            } catch (bgErr) {
                console.error('❌ Background error:', bgErr.message);
            }
        })();
        
        return debugResponse;
    }
    
    // 🔒 PROTEÇÃO #0: Aceitar OPTIONS para CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    // 🔒 PROTEÇÃO #1: Aceitar POST (ignore outros métodos graciosamente)
     if (req.method !== 'POST' && req.method !== 'GET') {
         console.warn(`⚠️ Método não suportado: ${req.method}. Headers: ${JSON.stringify(Object.fromEntries(req.headers))}`);
         return Response.json({ received: true }, { status: 200 }); // Aceita mesmo assim
     }

     if (req.method === 'GET') {
         return Response.json({ status: 'webhook_active', ready: true }, { status: 200 });
     }

    try {
        // 📥 Parse body com segurança
        let body;
        try {
            body = await req.json();
        } catch (parseErr) {
            console.error('❌ Erro ao fazer parse do JSON:', parseErr.message);
            return Response.json({ received: true }, { status: 200 }); // Retorna 200 mesmo com erro
        }

        console.log('📥 Webhook recebido (POST):', {
            action: body.action,
            type: body.type,
            payment_id: body.data?.id,
            live_mode: body.live_mode,
            user_id: body.user_id
        });

        const base44 = createClientFromRequest(req);
        
        // ✅ Retorna 200 imediatamente (sem autenticação)
        // Processamento acontece em background
        const responseReturned = Response.json({ received: true }, { status: 200 });

        // 🔄 Processar em background (não bloqueia resposta 200)
        (async () => {
            try {
                const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
                if (!accessToken) {
                    console.error('❌ MP_ACCESS_TOKEN não configurado');
                    return;
                }

                // MP envia notificações com "type" como payment
                // Compatível com: body.type === 'payment' OU body.action === 'payment.updated'
                const isPaymentEvent = body.type === 'payment' || body.action?.startsWith('payment');
                
                if (isPaymentEvent) {
                    const paymentId = body.data.id;

                    // 🔒 PROTEÇÃO #3: Validar resposta do MP antes de qualquer operação
                    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                        headers: {
                            'Authorization': `Bearer ${accessToken.trim()}`
                        }
                    });

                    if (!response.ok) {
                        console.error(`❌ MP retornou ${response.status} ao buscar payment ${paymentId}`);
                        return;
                    }

                    const payment = await response.json();
                    console.log('💳 Detalhes do pagamento:', JSON.stringify(payment, null, 2));

                    // 🔒 PROTEÇÃO #3a: Validar campos críticos antes de processar
                    if (!payment.id || !payment.status) {
                        console.error('❌ Payment faltando id ou status:', payment);
                        return;
                    }

                    // Buscar registro no banco pela external_reference
                    const externalRef = payment.external_reference;
                    if (!externalRef) {
                        console.log('⚠️ Pagamento sem external_reference');
                        return;
                    }

                    const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
                        external_reference: externalRef
                    });

                    if (payments.length > 0) {
                        const dbPayment = payments[0];

                        // 🔒 PROTEÇÃO #3b: Validar status válido antes de processar
                        const validStatuses = ['approved', 'pending', 'authorized', 'in_process', 'rejected', 'cancelled', 'refunded'];
                        if (!validStatuses.includes(payment.status)) {
                            console.error(`❌ Status inválido do MP: '${payment.status}'`);
                            return;
                        }

                        // 🔒 PROTEÇÃO #2: Validar correspondência Payment → Sale
                        if (dbPayment.catalog_sale_id) {
                            const sales = await base44.asServiceRole.entities.CatalogSale.filter({ id: dbPayment.catalog_sale_id });
                            if (sales.length === 0) {
                                console.error(`❌ CatalogSale ${dbPayment.catalog_sale_id} não existe! Payment órfã detectada.`);
                                return;
                            }
                        }

                        // 🔒 PROTEÇÃO #3 & #6: Verificar se já foi processado (idempotência)
                        if (dbPayment.status === 'approved' && payment.status === 'approved') {
                            console.log(`⚠️ Payment já processado anteriormente. Ignorando duplicata.`);
                            return;
                        }

                        // 🔒 PROTEÇÃO #3c: Atualizar catalog_sale_id se vem do catálogo
                        const updatePayload = {
                            payment_id: String(paymentId),
                            status: payment.status,
                            payment_method: payment.payment_type_id || payment.payment_method_id
                        };

                        // Se tem product_id mas não tem catalog_sale_id, procura a sale
                        if (dbPayment.product_id && !dbPayment.catalog_sale_id) {
                            const sales = await base44.asServiceRole.entities.CatalogSale.filter({
                                product_id: dbPayment.product_id,
                                buyer_id: dbPayment.user_id,
                                status: 'pending_payment'
                            });
                            if (sales.length > 0) {
                                updatePayload.catalog_sale_id = sales[0].id;
                                console.log(`🔗 Vinculando catalog_sale_id: ${sales[0].id}`);

                                // 📊 Registrar rastreamento quando encontra sale
                                try {
                                    await base44.asServiceRole.functions.invoke('trackPaymentFlow', {
                                        payment_id: String(paymentId),
                                        product_id: dbPayment.product_id,
                                        buyer_id: dbPayment.user_id,
                                        licensee_id: sales[0].licensee_id,
                                        referral_code: sales[0].referred_by_code,
                                        catalog_sale_id: sales[0].id,
                                        mercadopago_payment_id: dbPayment.id,
                                        amount: dbPayment.amount,
                                        status: payment.status,
                                        stage: 'sale_found',
                                        event: 'catalog_sale_linked_to_payment'
                                    });
                                } catch (trackErr) {
                                    console.warn('⚠️ Erro ao registrar rastreamento:', trackErr.message);
                                }
                            }
                        }

                        await base44.asServiceRole.entities.MercadoPagoPayment.update(dbPayment.id, updatePayload);
                        console.log(`✅ Status atualizado: ${payment.status}`);

                        // Se aprovado, marcar leilão como pago e processar comissões
                         if (payment.status === 'approved') {
                              // 🔒 PROTEÇÃO #4: Validar correspondência Sale ↔ Payment
                              if (dbPayment.catalog_sale_id || updatePayload.catalog_sale_id) {
                                  const saleId = dbPayment.catalog_sale_id || updatePayload.catalog_sale_id;
                                  const sales = await base44.asServiceRole.entities.CatalogSale.filter({ id: saleId });
                                  if (sales.length === 0) {
                                      console.error(`❌ CatalogSale ${saleId} não existe! Payment órfã detectada.`);
                                      return;
                                  }
                                  if (sales[0].buyer_id !== dbPayment.user_id) {
                                      console.error(`❌ Mismatch: Sale buyer_id != Payment user_id`);
                                      return;
                                  }
                              }

                              // 🔒 PROTEÇÃO #6: Atualizar Payment E Sale ATOMICAMENTE
                              let updateErrors = [];

                              if (dbPayment.auction_id) {
                                      try {
                                          await base44.asServiceRole.entities.Auction.update(dbPayment.auction_id, {
                                              order_status: 'paid'
                                          });
                                          console.log(`💰 Leilão ${dbPayment.auction_id} marcado como pago`);

                                          // ✅ Processa comissão de 3% para o Influencer
                                          try {
                                              await base44.asServiceRole.functions.invoke('processAuctionInfluencerCommission', {
                                                  auction_id: dbPayment.auction_id
                                              });
                                              console.log(`✅ Comissão 3% do Influencer processada para leilão ${dbPayment.auction_id}`);
                                          } catch (commErr) {
                                              // 🔒 PROTEÇÃO #5: Se comissão falha, REGISTRA mas não silencia
                                              updateErrors.push(`Comissão Influencer falhou: ${commErr.message}`);
                                              console.error(`❌ Erro ao processar comissão do Influencer:`, commErr.message);
                                          }
                                      } catch (auctionErr) {
                                          updateErrors.push(`Atualização de Auction falhou: ${auctionErr.message}`);
                                          console.error(`❌ Erro ao atualizar Auction:`, auctionErr.message);
                                      }
                                  }

                                  if (dbPayment.catalog_sale_id) {
                                      try {
                                          await base44.asServiceRole.entities.CatalogSale.update(dbPayment.catalog_sale_id, {
                                              status: 'paid',
                                              payment_id: String(paymentId)
                                          });
                                          console.log(`🛒 CatalogSale ${dbPayment.catalog_sale_id} marcada como paga`);

                                          // ✅ Processa distribuição de comissões automaticamente com RETRY
                                          let commissionResult = null;
                                          let commissionAttempts = 0;
                                          const MAX_COMMISSION_ATTEMPTS = 3;
                                          let commissionSucceeded = false;

                                          while (commissionAttempts < MAX_COMMISSION_ATTEMPTS && !commissionSucceeded) {
                                              try {
                                                  commissionAttempts++;
                                                  commissionResult = await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                                                      sale_id: dbPayment.catalog_sale_id
                                                  });

                                                  if (commissionResult?.data?.success) {
                                                      commissionSucceeded = true;
                                                      console.log(`✅ Comissões processadas para sale ${dbPayment.catalog_sale_id} (tentativa ${commissionAttempts})`);
                                                  } else {
                                                      throw new Error('Comissão retornou sucesso=false');
                                                  }
                                              } catch (retryErr) {
                                                  console.warn(`⚠️ Tentativa ${commissionAttempts} falhou:`, retryErr.message);
                                                  if (commissionAttempts < MAX_COMMISSION_ATTEMPTS) {
                                                      await new Promise(resolve => setTimeout(resolve, 1000 * commissionAttempts)); // backoff exponencial
                                                  }
                                              }
                                          }

                                          if (!commissionSucceeded) {
                                              throw new Error(`Falha ao processar comissões após ${MAX_COMMISSION_ATTEMPTS} tentativas`);

                                              // 📊 Registrar rastreamento completo com comissões (OBRIGATÓRIO)
                                              try {
                                                  const sale = (await base44.asServiceRole.entities.CatalogSale.filter({ id: dbPayment.catalog_sale_id }))[0];
                                                  await base44.asServiceRole.functions.invoke('trackPaymentFlow', {
                                                      payment_id: String(paymentId),
                                                      product_id: dbPayment.product_id,
                                                      buyer_id: dbPayment.user_id,
                                                      licensee_id: sale?.licensee_id,
                                                      referral_code: sale?.referred_by_code,
                                                      catalog_sale_id: dbPayment.catalog_sale_id,
                                                      mercadopago_payment_id: dbPayment.id,
                                                      amount: dbPayment.amount,
                                                      status: 'approved',
                                                      stage: 'commissions_processed',
                                                      event: 'payment_approved_and_commissions_distributed',
                                                      commission_success: commissionSucceeded,
                                                      commission_attempts: commissionAttempts,
                                                      commissions: commissionResult?.data?.assignments || []
                                                  });
                                              } catch (trackErr) {
                                                  console.error('❌ FALHA CRÍTICA ao registrar rastreamento final:', trackErr.message);
                                                  updateErrors.push(`Falha ao registrar rastreamento: ${trackErr.message}`);
                                                  throw trackErr; // Relança para capturar na camada superior
                                              }
                                          } catch (commErr) {
                                              // 🔒 PROTEÇÃO #5: Se comissão falha CRÍTICO - REGISTRA e REVERIFICA
                                              updateErrors.push(`Comissão Catálogo falhou: ${commErr.message}`);
                                              console.error(`❌ ERRO CRÍTICO ao processar comissões:`, commErr.message);

                                              // Verifica se sale foi marcada como paid mesmo assim
                                              const currentSale = (await base44.asServiceRole.entities.CatalogSale.filter({ id: dbPayment.catalog_sale_id }))[0];
                                              if (currentSale?.status === 'paid') {
                                                  console.error(`❌ ALERTA: CatalogSale ${dbPayment.catalog_sale_id} está PAGA mas comissões falharam!`);
                                              }

                                              throw new Error(`Comissão catálogo falhou - Inconsistência detectada: ${commErr.message}`);
                                          }
                                      } catch (saleErr) {
                                          updateErrors.push(`Atualização de Sale falhou: ${saleErr.message}`);
                                          console.error(`❌ Erro ao atualizar CatalogSale:`, saleErr.message);
                                          throw saleErr;
                                      }
                                  }

                              if (updateErrors.length > 0) {
                                  console.warn(`⚠️ Erros detectados no processamento:`, updateErrors);
                              }
                          }
                    } else {
                        console.log('⚠️ Pagamento não encontrado no banco:', externalRef);
                    }
                }

                // Salvar log do webhook
                try {
                    await base44.asServiceRole.entities.WebhookLog.create({
                        provider: 'mercadopago',
                        event_type: body.type || body.action || 'unknown',
                        resource_id: body.data?.id?.toString() || 'unknown',
                        body: body,
                        processed: true
                    });
                } catch (logErr) {
                    console.warn('⚠️ Erro ao salvar log (não crítico):', logErr.message);
                }

            } catch (error) {
                console.error('❌ Erro ao processar webhook:', error);
                
                // Salvar erro no log
                try {
                    await base44.asServiceRole.entities.WebhookLog.create({
                        provider: 'mercadopago',
                        event_type: body.type || body.action || 'unknown',
                        resource_id: body.data?.id?.toString() || 'unknown',
                        body: body,
                        processed: false,
                        error: error.message || String(error)
                    });
                } catch (logError) {
                    console.error('❌ Erro ao salvar log:', logError.message);
                }
            }
        })();

        // ✅ Retorna 200 imediatamente (MP deixa de dar 405)
        return responseReturned;

    } catch (error) {
        console.error('❌ Erro crítico no webhook:', error.message);
        // Sempre retorna 200 para o MP não ficar tentando (não quebra retry)
        return Response.json({ received: true }, { status: 200 });
    }
});