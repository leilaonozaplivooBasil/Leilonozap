import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { cepDestino, productId } = await req.json();

        if (!cepDestino) {
            return Response.json({ error: "CEP destino é obrigatório" }, { status: 400 });
        }

        const cep = String(cepDestino).replace(/\D/g, '');

        // Buscar configurações de frete
        const settings = await base44.asServiceRole.entities.FreteSettings.list();
        if (settings.length === 0) {
            return Response.json({ error: "Configurações de frete não encontradas. Configure no painel admin." }, { status: 400 });
        }

        const config = settings[0];

        // Buscar produto para obter dimensões (opcional)
        let product = null;
        if (productId) {
            const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
            product = products.length > 0 ? products[0] : null;
        }

        // Usar dimensões do produto ou padrão
        const peso = product?.peso || config.peso_padrao;
        const comprimento = product?.comprimento || config.comprimento_padrao;
        const altura = product?.altura || config.altura_padrao;
        const largura = product?.largura || config.largura_padrao;

        // Verificar e obter token válido
        let token = config.token_cache;
        const now = new Date();
        const expiry = config.token_expiry ? new Date(config.token_expiry) : null;

        if (!token || !expiry || now >= expiry) {
            // Gerar novo token
            const tokenResponse = await fetch('https://api.correios.com.br/token/v1/autenticar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    numero: config.client_id
                })
            });

            if (!tokenResponse.ok) {
                return Response.json({ 
                    error: "Erro ao autenticar com Correios. Verifique suas credenciais.",
                    details: await tokenResponse.text()
                }, { status: 500 });
            }

            const tokenData = await tokenResponse.json();
            token = tokenData.token;

            // Calcular expiração (geralmente 24h)
            const newExpiry = new Date();
            newExpiry.setHours(newExpiry.getHours() + 24);

            // Salvar token no cache
            await base44.asServiceRole.entities.FreteSettings.update(config.id, {
                token_cache: token,
                token_expiry: newExpiry.toISOString()
            });
        }

        // Montar lista de serviços
        const servicos = [];
        if (config.servico_sedex) servicos.push('04014');
        if (config.servico_pac) servicos.push('04510');

        if (servicos.length === 0) {
            return Response.json({ error: "Nenhum serviço de frete habilitado" }, { status: 400 });
        }

        // Calcular frete
        const freteResponse = await fetch('https://api.correios.com.br/preco/v1/nacional', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cepOrigem: config.cep_origem,
                cepDestino: cep,
                peso: peso.toString(),
                comprimento: comprimento.toString(),
                altura: altura.toString(),
                largura: largura.toString(),
                servicos: servicos
            })
        });

        if (!freteResponse.ok) {
            const errorText = await freteResponse.text();
            return Response.json({ 
                error: "Erro ao calcular frete com Correios",
                details: errorText
            }, { status: 500 });
        }

        const freteData = await freteResponse.json();

        // Formatar resposta
        const resultado = {};

        if (freteData && Array.isArray(freteData)) {
            freteData.forEach(servico => {
                const nome = servico.codigo === '04014' ? 'SEDEX' : 'PAC';
                resultado[nome] = {
                    valor: servico.valor ? parseFloat(servico.valor).toFixed(2) : "Indisponível",
                    prazo: servico.prazoEntrega ? `${servico.prazoEntrega} dias úteis` : "Indisponível"
                };
            });
        }

        return Response.json(resultado);

    } catch (error) {
        console.error('Erro em calculateShipping:', error);
        return Response.json({ 
            error: "Frete indisponível no momento",
            details: error.message 
        }, { status: 500 });
    }
});