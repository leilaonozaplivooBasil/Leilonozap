import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica se é admin
    const currentUser = await base44.auth.me().catch(() => null);
    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    const payload = await req.json().catch(() => ({}));
    const { user_id, data } = payload;
    
    if (!user_id || !data) {
      return Response.json({ error: 'Missing user_id or data' }, { status: 400 });
    }
    
    // Valida email se fornecido
    if (data.email && !data.email.includes('@')) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }
    
    // Valida nome se fornecido
    if (data.full_name && data.full_name.trim().length === 0) {
      return Response.json({ error: 'Name cannot be empty' }, { status: 400 });
    }
    
    // Remove campos que não devem ser atualizados por aqui
    const safeData = { ...data };
    delete safeData.password; // Senha é atualizada pela outra função
    delete safeData.id;
    delete safeData.created_date;
    delete safeData.created_by;
    
    // Usa service role para bypass de RLS
    await base44.asServiceRole.entities.AppUser.update(user_id, safeData);
    
    // Log da alteração
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'User_Data_Updated',
      status: 'success',
      message: `User data updated by admin: ${currentUser.email}`,
      component_name: 'updateUserData',
      payload: { 
        user_id, 
        updated_fields: Object.keys(safeData),
        admin_id: currentUser.id 
      }
    }).catch(() => {});
    
    return Response.json({ success: true, message: 'User data updated successfully' });
    
  } catch (error) {
    console.error('Error updating user data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});