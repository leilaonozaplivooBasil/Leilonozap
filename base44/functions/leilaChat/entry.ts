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

    // Envia a mensagem atual — o agente processa de forma ASSÍNCRONA, então
    // addMessage não devolve a resposta pronta. É preciso buscar a conversa
    // de novo em seguida, até aparecer uma mensagem nova do assistente.
    const conversationId = conversation?.id || conversation?._id;
    const previousAssistantCount = (conversation?.messages || [])
      .filter(m => m.role === 'assistant').length;

    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: message
    });

    let reply = '';
    const maxAttempts = 20; // ~20s de espera
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const current = await base44.agents.getConversation(conversationId);
      const currentMessages = current?.messages || [];
      const assistantMsgs = currentMessages.filter(m => m.role === 'assistant');
      if (assistantMsgs.length > previousAssistantCount) {
        reply = assistantMsgs[assistantMsgs.length - 1]?.content || '';
        if (reply) break;
      }
    }
    if (!reply) reply = 'Não consegui responder agora. Tente novamente.';

    return Response.json({
      status: 'success',
      conversation_id: conversation?.id || conversation?._id,
      response: reply
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});