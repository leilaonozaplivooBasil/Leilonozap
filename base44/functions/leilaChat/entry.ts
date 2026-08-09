import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ⚠️ CAUSA-RAIZ REAL (confirmada por teste): base44.agents (via createClientFromRequest)
// exige uma sessão de usuário autenticado NA PLATAFORMA Base44 ("agents act as the
// current app user"). Este app usa autenticação própria (Supabase/AppUser) — visitantes
// reais NUNCA têm sessão Base44, então essa chamada sempre falhava com 401
// "User must be authenticated to create a conversation" fora do dashboard do builder.
// Correção: usar base44.asServiceRole.agents, que roda com identidade de serviço fixa
// do app (created_by_id: "service_...") e não depende de nenhuma sessão de usuário.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { message, history } = await req.json();
    if (!message) return Response.json({ error: 'message é obrigatório' }, { status: 400 });

    // Usa o agente leila_atendente (config em base44/agents/leila_atendente.jsonc)
    const conversation = await base44.asServiceRole.agents.createConversation({
      agent_name: 'leila_atendente',
      metadata: { name: 'Leila Atendimento' }
    });

    // Envia histórico anterior (se houver)
    if (Array.isArray(history)) {
      for (const h of history) {
        await base44.asServiceRole.agents.addMessage(conversation, {
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

    await base44.asServiceRole.agents.addMessage(conversation, {
      role: 'user',
      content: message
    });

    let reply = '';
    const maxAttempts = 20; // ~20s de espera
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const current = await base44.asServiceRole.agents.getConversation(conversationId);
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