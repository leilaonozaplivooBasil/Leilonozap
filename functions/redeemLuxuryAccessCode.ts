import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const code = (body?.code || '').trim();
    if (!code) {
      return Response.json({ error: 'code is required' }, { status: 400 });
    }

    // Fetch active code
    const rows = await base44.asServiceRole.entities.LuxuryAccessCode.filter({ code, is_active: true });
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'invalid_or_inactive_code' }, { status: 404 });
    }

    const rec = rows[0];
  
    let userId = null;
    try {
      const u = await base44.auth.me();
      userId = u?.id || null;
    } catch (_) {}

    await base44.asServiceRole.entities.LuxuryAccessCode.update(rec.id, {
      is_used: true,
      is_active: true,
      used_by_user_id: userId,
      used_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});