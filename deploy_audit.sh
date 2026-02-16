#!/bin/bash
# Script para facilitar o deploy da função de auditoria segura via NPX
echo "==============================================="
echo "   DEPLOY AUTOMÁTICO - AUDITORIA SEGURA (SIA)  "
echo "==============================================="
echo ""
echo "Enviando código para a nuvem (Supabase Edge Function)..."
echo "OBS: Usando 'npx' para garantir a execução mesmo sem CLI instalado."

# Executa o comando via npx (instala se necessário)
npx -y supabase functions deploy exportAuditData --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCESSO! A função 'exportAuditData' está online."
    echo "Agora você pode usar o painel 'Auditoria de Comissões' com segurança."
else
    echo ""
    echo "❌ FALHA no deploy. Verifique se você está logado no Supabase CLI."
    echo "Tente rodar: npx supabase login"
fi
