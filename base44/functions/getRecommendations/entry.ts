import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      // Usuário não logado - retorna recomendações genéricas
    }

    if (!user) {
      const allAuctions = await base44.asServiceRole.entities.Auction.filter({ status: 'active' });
      const randomAuctions = allAuctions
        .sort(() => Math.random() - 0.5)
        .slice(0, 6);
      
      return Response.json({
        recommendations: randomAuctions,
        stats: {
          totalViews: 0,
          totalFavorites: 0,
          totalBids: 0,
          topCategories: []
        }
      });
    }

    // Buscar dados do usuário para recomendações (otimizado)
    const [favorites, views, preferences, bids, allAuctions] = await Promise.all([
      base44.entities.FavoriteAuction.filter({ user_id: user.id }),
      base44.entities.AuctionView.filter({ user_id: user.id }),
      base44.entities.UserPreference.filter({ user_id: user.id }),
      base44.entities.Bid.filter({ created_by: user.email }),
      base44.entities.Auction.filter({ status: 'active' })
    ]);

    // Stats simplificados para não sobrecarregar
    const totalViewCount = views.reduce((sum, v) => sum + (v.view_count || 1), 0);
    const totalFavorites = favorites.length;
    const totalBids = bids.length;

    // Extrair categorias dos favoritos e visualizações
    const favoriteIds = new Set(favorites.map(f => f.auction_id));
    const viewedCategories = {};
    const viewedAuctionIds = new Set();

    views.forEach(v => {
      viewedAuctionIds.add(v.auction_id);
      if (v.category) {
        viewedCategories[v.category] = (viewedCategories[v.category] || 0) + v.view_count;
      }
    });

    // Extrair categorias dos lances
    const bidAuctionIds = new Set(bids.map(b => b.auction_id));
    
    // Preferências do usuário
    const userPref = preferences[0] || {};
    const preferredCategories = userPref.preferred_categories || [];
    const priceMin = userPref.price_range_min || 0;
    const priceMax = userPref.price_range_max || 999999;
    const preferredSource = userPref.preferred_source || 'all';

    // Calcular score para cada leilão ativo
    const scoredAuctions = allAuctions
      .filter(auction => {
        // Não recomendar leilões já favoritados
        if (favoriteIds.has(auction.id)) return false;
        
        // Filtro de faixa de preço
        const price = auction.current_price || auction.starting_price;
        if (price < priceMin || price > priceMax) return false;

        // Filtro de origem (se especificado)
        if (preferredSource !== 'all' && auction.product_source !== preferredSource) return false;

        return true;
      })
      .map(auction => {
        let score = 0;
        const category = auction.category;

        // +30 pontos se categoria está nas preferências
        if (preferredCategories.includes(category)) {
          score += 30;
        }

        // +20 pontos por visualização na mesma categoria
        if (viewedCategories[category]) {
          score += Math.min(viewedCategories[category] * 5, 20);
        }

        // +15 pontos se já deu lance em leilão similar (mesma categoria)
        const bidInCategory = bids.some(b => {
          const bidAuction = allAuctions.find(a => a.id === b.auction_id);
          return bidAuction && bidAuction.category === category;
        });
        if (bidInCategory) score += 15;

        // +10 pontos se leilão está terminando em breve (urgência)
        const endTime = new Date(auction.end_time).getTime();
        const now = Date.now();
        const hoursRemaining = (endTime - now) / (1000 * 60 * 60);
        if (hoursRemaining > 0 && hoursRemaining < 6) {
          score += 10;
        }

        // +5 pontos por popularidade (baseado no preço atual vs inicial)
        const priceIncrease = (auction.current_price || auction.starting_price) / auction.starting_price;
        if (priceIncrease > 1.5) score += 5;

        return { ...auction, _score: score };
      })
      .filter(a => a._score > 0) // Só recomenda se tiver algum score
      .sort((a, b) => b._score - a._score)
      .slice(0, 6); // Top 6 recomendações

    return Response.json({
      recommendations: scoredAuctions,
      stats: {
        totalViews: totalViewCount,
        totalFavorites: totalFavorites,
        totalBids: totalBids,
        topCategories: Object.entries(viewedCategories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat)
      }
    });

  } catch (error) {
    console.error("Erro ao gerar recomendações:", error);
    // Retorna recomendações vazias em caso de rate limit
    return Response.json({ 
      recommendations: [],
      stats: {
        totalViews: 0,
        totalFavorites: 0,
        totalBids: 0,
        topCategories: []
      }
    });
  }
});