import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { 
                status: 403, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const { users, subject, body, sms, sendEmail, sendSMS } = await req.json();

        if (!users || users.length === 0) {
            return new Response(JSON.stringify({ error: 'Nenhum destinatário.' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        console.log(`📨 Iniciando envio para ${users.length} usuários...`);
        
        let emailsSent = 0;
        let smsSent = 0;
        let errors = [];

        for (const targetUser of users) {
            try {
                // 🎯 PERSONALIZAÇÃO COMPLETA COM HTML
                const personalizedSubject = subject
                    .replace(/\{\{name\}\}/g, targetUser.full_name);
                
                const personalizedBody = body
                    .replace(/\{\{name\}\}/g, targetUser.full_name)
                    .replace(/\{\{valora_balance\}\}/g, (targetUser.valora_pay_balance || 0).toFixed(2))
                    .replace(/\{\{referral_link\}\}/g, targetUser.referral_link || 'https://leilaonozap.com');
                
                const personalizedSMS = sms
                    .replace(/\{\{name\}\}/g, targetUser.full_name)
                    .replace(/\{\{valora_balance\}\}/g, (targetUser.valora_pay_balance || 0).toFixed(2))
                    .replace(/\{\{referral_link\}\}/g, targetUser.referral_link || 'https://leilaonozap.com');

                // 📧 ENVIAR EMAIL HTML
                if (sendEmail && targetUser.email) {
                    await base44.integrations.Core.SendEmail({
                        to: targetUser.email,
                        subject: personalizedSubject,
                        body: personalizedBody, // HTML COMPLETO COM IMAGENS
                        from_name: "Leilão NoZap"
                    });
                    emailsSent++;
                    console.log(`✅ Email enviado para: ${targetUser.email}`);
                }

                // 📱 ENVIAR SMS (placeholder - futura integração Twilio/WhatsApp)
                if (sendSMS && targetUser.phone) {
                    console.log(`📱 SMS para ${targetUser.phone}: ${personalizedSMS}`);
                    smsSent++;
                }

            } catch (error) {
                console.error(`❌ Erro ao enviar para ${targetUser.email}:`, error);
                errors.push({ user: targetUser.email, error: error.message });
            }
        }

        return new Response(JSON.stringify({ 
            success: true,
            emailsSent,
            smsSent,
            errors,
            message: `✅ Enviado! ${emailsSent} emails, ${smsSent} SMS`
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('❌ Erro na função sendBulkMessages:', error);
        return new Response(JSON.stringify({ 
            error: error.message 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});