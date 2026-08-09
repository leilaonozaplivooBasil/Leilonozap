import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, history } = await req.json();
    if (!message) return Response.json({ error: 'message é obrigatório' }, { status: 400 });

    // Usa o agente leila_atendente (config em base44/agents/leila_atendente.jsonc)
    const conversation = await base44.agents.createConversation({
      agent_name: 'leila_atendente',
      metadata: { name: 'Leila Atendimento' }
    });

    // Envia histórico anterior (se houver)
    if (Array.isArray(history)) {
      for (const h of history) {
        await base44.agents.addMessage(conversation, {
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content
        });
      }
    }

    // Envia a mensagem atual e aguarda a resposta
    const updated = await base44.agents.addMessage(conversation, {
      role: 'user',
      content: message
    });

    // Pega a última mensagem do assistente
    const messages = updated?.messages || updated?.conversation?.messages || [];
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    const reply = lastAssistant?.content || 'Não consegui responder agora. Tente novamente.';

    return Response.json({
      status: 'success',
      conversation_id: conversation?.id || conversation?._id,
      response: reply
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});