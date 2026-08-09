// leilaChat — Atendente IA Leila para qualquer usuário logado.
// Usa AGENT_API_KEY (já configurada) pra chamar a API de agentes da Base44.
// Não exige admin — qualquer usuário autenticado pode conversar com a Leila.
const AGENT_API_KEY = process.env.AGENT_API_KEY;
const AGENT_BASE_URL = 'https://app.base44.com/api/agents/69b5a570c44d21213148daa7';

const LEILA_PERSONA = `Você é a Leila, a atendente IA oficial da plataforma Leilão NoZap.
Você ajuda usuários com dúvidas sobre:
- Leilões online (como participar, dar lances, arrematar)
- Loja Virtual (produtos, carrinho, pedidos, frete)
- Sistema de Alavancagem (planos de carreira, comissões, níveis)
- Carteira digital (saldo, depósitos, saques)
- Pedidos e rastreio

REGRAS:
- Responda sempre em português do Brasil, de forma amigável, curta e direta.
- Não invente informações. Se não souber, diga que vai direcionar a dúvida para a equipe.
- Nunca peça dados sensíveis (senha, CPF, número de cartão).
- Não execute transações — apenas oriente o usuário onde fazer cada ação no app.
- Se o usuário perguntar sobre saldo específico ou dados da conta, oriente a ir na aba "Carteira".`;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const message = String(body?.message || '').slice(0, 2000);
    const history = Array.isArray(body?.history) ? body.history.slice(-10) : [];
    if (!message) return res.status(400).json({ success: false, error: 'message é obrigatório' });
    if (!AGENT_API_KEY) return res.status(200).json({ success: false, error: 'AGENT_API_KEY não configurada' });

    const headers = { 'api_key': AGENT_API_KEY, 'Content-Type': 'application/json' };

    // Cria conversa nova a cada chamada (simples e stateless do lado do cliente)
    const convRes = await fetch(`${AGENT_BASE_URL}/conversations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Leila Atendimento' })
    });
    const convData = await convRes.json();
    const convId = convData.id || convData.conversation_id;
    if (!convId) return res.status(200).json({ success: false, error: 'Não foi possível criar a conversa' });

    // Monta o histórico no conteúdo da mensagem
    const histStr = history.length > 0
      ? history.map(h => `${h.role === 'user' ? 'Usuário' : 'Leila'}: ${h.content}`).join('\n') + '\n\n'
      : '';

    const fullMessage = `${LEILA_PERSONA}\n\n--- CONVERSA ANTERIOR ---\n${histStr}--- NOVA MENSAGEM ---\n${message}\n\nLeila:`;

    const msgRes = await fetch(`${AGENT_BASE_URL}/conversations/${convId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: fullMessage })
    });
    const msgData = await msgRes.json();

    const reply = msgData.content || msgData.message || (typeof msgData === 'string' ? msgData : '') || 'Não consegui responder agora. Tente novamente.';

    return res.status(200).json({ success: true, response: reply, conversation_id: convId });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro na IA', details: String(e?.message || e) });
  }
}