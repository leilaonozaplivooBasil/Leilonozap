import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Valida admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { auction_id, final_price } = await req.json();
    
    if (!auction_id || !final_price) {
      return Response.json({ error: 'auction_id e final_price obrigatórios' }, { status: 400 });
    }
    
    // Busca leilão
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
    if (!auctions?.length) {
      return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
    }
    
    const auction = auctions[0];
    
    // Verifica se tem produto vinculado
    if (!auction.product_id) {
      return Response.json({ 
        success: true, 
        message: 'Leilão sem produto vinculado, nenhuma ação necessária' 
      });
    }
    
    // Busca produto
    const products = await base44.asServiceRole.entities.Product.filter({ id: auction.product_id });
    if (!products?.length) {
      return Response.json({ error: 'Produto vinculado não encontrado' }, { status: 404 });
    }
    
    const product = products[0];
    
    // Calcula nova quantidade
    const newQuantity = Math.max(0, product.quantity - 1);
    const newQuantitySold = (product.quantity_sold || 0) + 1;
    
    // Calcula lucro da venda
    const saleProfit = final_price - product.cost_price;
    const newTotalProfit = (product.profit || 0) + saleProfit;
    const newTotalSold = (product.sold_amount || 0) + final_price;
    
    // Define novo status
    let newStatus = product.status;
    if (newQuantity === 0) {
      newStatus = 'VENDIDO PIX'; // Marca como vendido quando acabar
    }
    
    // Atualiza produto
    await base44.asServiceRole.entities.Product.update(auction.product_id, {
      quantity: newQuantity,
      quantity_sold: newQuantitySold,
      sold_amount: newTotalSold,
      profit: newTotalProfit,
      status: newStatus
    });
    
    return Response.json({
      success: true,
      product_id: auction.product_id,
      previous_quantity: product.quantity,
      new_quantity: newQuantity,
      quantity_sold: newQuantitySold,
      sale_profit: saleProfit,
      total_profit: newTotalProfit,
      status_changed: newStatus !== product.status,
      new_status: newStatus
    });
    
  } catch (error) {
    console.error('Erro ao processar venda:', error);
    return Response.json({ 
      error: error.message || 'Erro no servidor'
    }, { status: 500 });
  }
});