import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ⚠️ CAUSA-RAIZ #1 (confirmada por teste): base44.agents (via createClientFromRequest)
// exige sessão de usuário autenticado NA PLATAFORMA Base44. Este app usa login próprio
// (Supabase/AppUser) — visitantes reais nunca têm essa sessão. Corrigido usando
// base44.asServiceRole.agents, que roda com identidade de serviço fixa do app.
//
// ⚠️ CAUSA-RAIZ #2 (o bug "buga na 2ª mensagem"): a versão anterior criava uma
// CONVERSA NOVA em toda mensagem e reenviava o histórico inteiro via addMessage
// antes da mensagem atual — cada addMessage dispara o agente de novo, então a
// partir da 2ª mensagem da conversa o processamento ficava tão lento que o
// polling de 20s expirava e caía no "Não consegui responder agora". Corrigido:
// a conversa é criada UMA VEZ e reaproveitada (conversation_id vai e volta com o
// frontend) — cada turno só manda a mensagem nova. Isso também dá memória real:
// a conversa completa já fica salva no agente, sem precisar replay de histórico.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { message, conversation_id } = await req.json();
    if (!message) return Response.json({ error: 'message é obrigatório' }, { status: 400 });

    let conversationId = conversation_id;
    let baseMessageCount = 0;

    if (conversationId) {
      // Conversa já existente — só confere quantas mensagens de assistente já tem
      // (referência pra saber quando a resposta NOVA chegou).
      try {
        const existing = await base44.asServiceRole.agents.getConversation(conversationId);
        baseMessageCount = (existing?.messages || []).filter(m => m.role === 'assistant').length;
      } catch {
        conversationId = null; // conversa inválida/expirada — cria uma nova abaixo
      }
    }

    if (!conversationId) {
      const conversation = await base44.asServiceRole.agents.createConversation({
        agent_name: 'leila_atendente',
        metadata: { name: 'Leila Atendimento' }
      });
      conversationId = conversation?.id || conversation?._id;
      baseMessageCount = (conversation?.messages || []).filter(m => m.role === 'assistant').length;
    }

    await base44.asServiceRole.agents.addMessage({ id: conversationId }, {
      role: 'user',
      content: message
    });

    let reply = '';
    const maxAttempts = 25; // ~25s de espera
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const current = await base44.asServiceRole.agents.getConversation(conversationId);
      const assistantMsgs = (current?.messages || []).filter(m => m.role === 'assistant');
      if (assistantMsgs.length > baseMessageCount) {
        reply = assistantMsgs[assistantMsgs.length - 1]?.content || '';
        if (reply) break;
      }
    }
    if (!reply) reply = 'Desculpa, demorei mais do que devia pra responder — pode repetir a pergunta?';

    return Response.json({
      status: 'success',
      conversation_id: conversationId,
      response: reply
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});