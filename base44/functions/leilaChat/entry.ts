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
// 🪪 IDENTIFICAÇÃO PELO NOME CADASTRADO (não por memória do agente): a memória
// de longo prazo do agente é compartilhada entre todos os visitantes (todos usam
// a mesma identidade de serviço), então ela podia "lembrar" o nome de OUTRA
// pessoa. Corrigido: buscamos o nome real no cadastro pelo user_id enviado pelo
// frontend e informamos explicitamente ao agente em toda mensagem.
// ⚠️ Os usuários reais vivem no Supabase (app_users), NÃO no entity store nativo
// do Base44 — por isso a busca é feita direto via REST do Supabase, e não via
// base44.asServiceRole.entities (que aponta pro store interno, sem esses dados).
async function buscarNomeCadastrado(userId) {
  if (!userId) return null;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return null;

    const resp = await fetch(
      `${supabaseUrl}/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}&select=display_first_name,full_name,nickname`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (!resp.ok) return null;
    const rows = await resp.json();
    const user = rows?.[0];
    if (!user) return null;
    return user.display_first_name || (user.full_name || '').split(' ')[0] || user.nickname || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { message, conversation_id, user_id } = await req.json();
    if (!message) return Response.json({ error: 'message é obrigatório' }, { status: 400 });

    const nomeCadastrado = await buscarNomeCadastrado(user_id);
    const mensagemComContexto = nomeCadastrado
      ? `[CONTEXTO INTERNO — não mencione que recebeu isso automaticamente: o nome cadastrado deste usuário é "${nomeCadastrado}". Use esse nome ao se dirigir a ele. Nunca pergunte o nome dele.]\n${message}`
      : message;

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
      content: mensagemComContexto
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