import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const MONTHLY_FEE = 25; // R$25 mensalidade

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    
    // Busca todos os licenciados do catálogo
    const allUsers = await base44.asServiceRole.entities.AppUser.filter({});
    const licensees = allUsers.filter(u => 
      u.career_levels?.includes('licenciado_catalogo') || 
      u.primary_career_level === 'licenciado_catalogo'
    );

    const results = {
      processed: 0,
      renewed: [],
      expired: [],
      warned: [],
      errors: []
    };

    for (const licensee of licensees) {
      try {
        const expiryDate = licensee.catalog_license_expiry ? new Date(licensee.catalog_license_expiry) : null;
        
        if (!expiryDate) {
          // Licenciado sem data de expiração - define 30 dias a partir de agora
          const newExpiry = new Date();
          newExpiry.setDate(newExpiry.getDate() + 30);
          
          await base44.asServiceRole.entities.AppUser.update(licensee.id, {
            catalog_license_expiry: newExpiry.toISOString(),
            catalog_license_active: true
          });
          continue;
        }

        const balance = licensee.catalog_commission_balance || 0;
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

        // Já expirou
        if (expiryDate <= now) {
          if (balance >= MONTHLY_FEE) {
            // Tem saldo - renova automaticamente
            const newExpiry = new Date();
            newExpiry.setDate(newExpiry.getDate() + 30);
            
            await base44.asServiceRole.entities.AppUser.update(licensee.id, {
              catalog_commission_balance: balance - MONTHLY_FEE,
              catalog_license_expiry: newExpiry.toISOString(),
              catalog_license_active: true
            });

            results.renewed.push({
              id: licensee.id,
              name: licensee.full_name,
              newBalance: balance - MONTHLY_FEE
            });
          } else {
            // Sem saldo suficiente - desativa
            const newCareerLevels = (licensee.career_levels || []).filter(c => c !== 'licenciado_catalogo');
            const newPrimaryLevel = licensee.primary_career_level === 'licenciado_catalogo' 
              ? (newCareerLevels[0] || 'usuario') 
              : licensee.primary_career_level;

            await base44.asServiceRole.entities.AppUser.update(licensee.id, {
              catalog_license_active: false,
              career_levels: newCareerLevels.length > 0 ? newCareerLevels : ['usuario'],
              primary_career_level: newPrimaryLevel,
              role: newCareerLevels.length > 0 ? 'licensee' : 'user'
            });

            results.expired.push({
              id: licensee.id,
              name: licensee.full_name,
              email: licensee.email
            });

            // Envia email de aviso
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: licensee.email,
                subject: '⚠️ Seu Catálogo Expirou - Leilão NoZap',
                body: `Olá ${licensee.full_name},\n\nSua licença do Catálogo expirou e seu link foi desativado.\n\nPara reativar, adicione saldo de pelo menos R$25,00 na sua carteira.\n\nEquipe Leilão NoZap`
              });
            } catch (emailErr) {
              console.error('Erro ao enviar email:', emailErr);
            }
          }
        }
        // Expira em até 5 dias e saldo insuficiente - envia aviso
        else if (daysUntilExpiry <= 5 && daysUntilExpiry > 0 && balance < MONTHLY_FEE) {
          results.warned.push({
            id: licensee.id,
            name: licensee.full_name,
            email: licensee.email,
            daysLeft: daysUntilExpiry,
            balance: balance
          });

          // Envia email de aviso
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: licensee.email,
              subject: `⚠️ Seu Catálogo expira em ${daysUntilExpiry} dias - Leilão NoZap`,
              body: `Olá ${licensee.full_name},\n\nSua licença do Catálogo expira em ${daysUntilExpiry} dias!\n\nSeu saldo atual: R$${balance.toFixed(2)}\nValor necessário: R$${MONTHLY_FEE.toFixed(2)}\nFaltam: R$${(MONTHLY_FEE - balance).toFixed(2)}\n\nAdicione saldo para não perder seu link de vendedor.\n\nEquipe Leilão NoZap`
            });
          } catch (emailErr) {
            console.error('Erro ao enviar email:', emailErr);
          }
        }
        // Expira em breve mas tem saldo - renova automaticamente
        else if (daysUntilExpiry <= 1 && balance >= MONTHLY_FEE) {
          const newExpiry = new Date(expiryDate);
          newExpiry.setDate(newExpiry.getDate() + 30);
          
          await base44.asServiceRole.entities.AppUser.update(licensee.id, {
            catalog_commission_balance: balance - MONTHLY_FEE,
            catalog_license_expiry: newExpiry.toISOString(),
            catalog_license_active: true
          });

          results.renewed.push({
            id: licensee.id,
            name: licensee.full_name,
            newBalance: balance - MONTHLY_FEE
          });
        }

        results.processed++;
      } catch (err) {
        results.errors.push({
          id: licensee.id,
          name: licensee.full_name,
          error: err.message
        });
      }
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});