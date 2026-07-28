import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    // Só admin autenticado pode conversar com o Superagente externo
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { message, context, conversation_id } = await req.json();

    if (!message) {
      return Response.json({ error: 'message é obrigatório' }, { status: 400 });
    }

    const AGENT_API_KEY = Deno.env.get("AGENT_API_KEY");
    if (!AGENT_API_KEY) {
      return Response.json({ error: 'AGENT_API_KEY não configurada' }, { status: 500 });
    }

    const AGENT_BASE_URL = 'https://app.base44.com/api/agents/69b5a570c44d21213148daa7';
    const headers = {
      'api_key': AGENT_API_KEY,
      'Content-Type': 'application/json'
    };

    // Usa conversation_id existente ou cria nova conversa
    let convId = conversation_id;
    if (!convId) {
      const convRes = await fetch(`${AGENT_BASE_URL}/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'NoZap Session' })
      });
      const convData = await convRes.json();
      convId = convData.id || convData.conversation_id;
    }

    if (!convId) {
      return Response.json({ error: 'Não foi possível criar conversa com o agente' }, { status: 500 });
    }

    // Monta mensagem com contexto opcional
    const fullMessage = context
      ? `${message}\n\n[CONTEXTO]\n${JSON.stringify(context, null, 2)}`
      : message;

    // Envia mensagem ao agente
    const msgRes = await fetch(`${AGENT_BASE_URL}/conversations/${convId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: fullMessage })
    });

    const msgData = await msgRes.json();

    return Response.json({
      status: 'success',
      conversation_id: convId,
      response: msgData.content || msgData.message || msgData
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});