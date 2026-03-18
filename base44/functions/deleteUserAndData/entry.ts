import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    // Apenas admin pode deletar usuários
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { user_id } = await req.json().catch(() => ({}));
    
    if (!user_id) {
      return Response.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // Impede que delete a si mesmo
    if (user.id === user_id) {
      return Response.json({ error: 'Não pode deletar sua própria conta' }, { status: 400 });
    }

    // Busca o usuário
    const userToDelete = await base44.asServiceRole.entities.AppUser.filter({ id: user_id });
    if (!Array.isArray(userToDelete) || userToDelete.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userFullName = userToDelete[0].full_name;

    // Deletar todos os dados associados ao usuário
    const deletedData = {
      user: null,
      auctions: 0,
      bids: 0,
      payments: 0,
      favorites: 0,
      auction_views: 0,
      wallet_transactions: 0,
      user_preferences: 0,
      influencer_leads: 0,
      influencer_purchases: 0,
      commission_records: 0,
      withdrawal_requests: 0,
      catalog_sales: 0
    };

    // 1. Deletar leilões criados pelo usuário
    try {
      const auctions = await base44.asServiceRole.entities.Auction.filter({ seller_id: user_id });
      if (Array.isArray(auctions)) {
        for (const auction of auctions) {
          await base44.asServiceRole.entities.Auction.delete(auction.id);
          deletedData.auctions++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar auctions:', e.message);
    }

    // 2. Deletar lances do usuário
    try {
      const bids = await base44.asServiceRole.entities.Bid.filter({ created_by: userToDelete[0].email });
      if (Array.isArray(bids)) {
        for (const bid of bids) {
          await base44.asServiceRole.entities.Bid.delete(bid.id);
          deletedData.bids++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar bids:', e.message);
    }

    // 3. Deletar pagamentos do usuário
    try {
      const payments = await base44.asServiceRole.entities.Payment.filter({ buyer_id: user_id });
      if (Array.isArray(payments)) {
        for (const payment of payments) {
          await base44.asServiceRole.entities.Payment.delete(payment.id);
          deletedData.payments++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar payments:', e.message);
    }

    // 4. Deletar leilões favoritos
    try {
      const favorites = await base44.asServiceRole.entities.FavoriteAuction.filter({ user_id: user_id });
      if (Array.isArray(favorites)) {
        for (const fav of favorites) {
          await base44.asServiceRole.entities.FavoriteAuction.delete(fav.id);
          deletedData.favorites++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar favorites:', e.message);
    }

    // 5. Deletar visualizações de leilões
    try {
      const views = await base44.asServiceRole.entities.AuctionView.filter({ user_id: user_id });
      if (Array.isArray(views)) {
        for (const view of views) {
          await base44.asServiceRole.entities.AuctionView.delete(view.id);
          deletedData.auction_views++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar auction views:', e.message);
    }

    // 6. Deletar transações de carteira
    try {
      const walletTxs = await base44.asServiceRole.entities.WalletTransaction.filter({ user_id: user_id });
      if (Array.isArray(walletTxs)) {
        for (const tx of walletTxs) {
          await base44.asServiceRole.entities.WalletTransaction.delete(tx.id);
          deletedData.wallet_transactions++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar wallet transactions:', e.message);
    }

    // 7. Deletar preferências de usuário
    try {
      const prefs = await base44.asServiceRole.entities.UserPreference.filter({ user_id: user_id });
      if (Array.isArray(prefs)) {
        for (const pref of prefs) {
          await base44.asServiceRole.entities.UserPreference.delete(pref.id);
          deletedData.user_preferences++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar user preferences:', e.message);
    }

    // 8. Deletar leads de influenciador
    try {
      const leads = await base44.asServiceRole.entities.InfluencerLead.filter({ influencer_id: user_id });
      if (Array.isArray(leads)) {
        for (const lead of leads) {
          await base44.asServiceRole.entities.InfluencerLead.delete(lead.id);
          deletedData.influencer_leads++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar influencer leads:', e.message);
    }

    // 9. Deletar compras de influenciador
    try {
      const purchases = await base44.asServiceRole.entities.InfluencerPurchase.filter({ influencer_id: user_id });
      if (Array.isArray(purchases)) {
        for (const purchase of purchases) {
          await base44.asServiceRole.entities.InfluencerPurchase.delete(purchase.id);
          deletedData.influencer_purchases++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar influencer purchases:', e.message);
    }

    // 10. Deletar registros de comissão
    try {
      const commissions = await base44.asServiceRole.entities.CommissionRecord.filter({ user_id: user_id });
      if (Array.isArray(commissions)) {
        for (const commission of commissions) {
          await base44.asServiceRole.entities.CommissionRecord.delete(commission.id);
          deletedData.commission_records++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar commission records:', e.message);
    }

    // 11. Deletar solicitações de saque
    try {
      const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.filter({ user_id: user_id });
      if (Array.isArray(withdrawals)) {
        for (const withdrawal of withdrawals) {
          await base44.asServiceRole.entities.WithdrawalRequest.delete(withdrawal.id);
          deletedData.withdrawal_requests++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar withdrawal requests:', e.message);
    }

    // 12. Deletar vendas do catálogo
    try {
      const sales = await base44.asServiceRole.entities.CatalogSale.filter({ licensee_id: user_id });
      if (Array.isArray(sales)) {
        for (const sale of sales) {
          await base44.asServiceRole.entities.CatalogSale.delete(sale.id);
          deletedData.catalog_sales++;
        }
      }
    } catch (e) {
      console.log('Erro ao deletar catalog sales:', e.message);
    }

    // 13. Se o usuário era indicador de alguém, desvincula esses usuários do Site Oficial
    try {
      const referred = await base44.asServiceRole.entities.AppUser.filter({ referred_by_id: user_id });
      if (Array.isArray(referred)) {
        // Busca o Site Oficial
        const siteOfficial = await base44.asServiceRole.entities.AppUser.filter({
          email: 'site@leilaonozap.com'
        });
        const siteId = Array.isArray(siteOfficial) && siteOfficial.length > 0 ? siteOfficial[0].id : null;
        
        for (const refUser of referred) {
          await base44.asServiceRole.entities.AppUser.update(refUser.id, {
            referred_by_id: siteId || null
          });
        }
      }
    } catch (e) {
      console.log('Erro ao desvinculzar usuários indicados:', e.message);
    }

    // 14. Deletar o próprio usuário
    try {
      await base44.asServiceRole.entities.AppUser.delete(user_id);
      deletedData.user = userFullName;
    } catch (e) {
      console.log('Erro ao deletar usuário:', e.message);
    }

    return Response.json({
      success: true,
      message: `Usuário ${userFullName} e todos os dados foram deletados com sucesso`,
      deletedData
    });

  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});