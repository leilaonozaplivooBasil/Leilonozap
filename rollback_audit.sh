#!/bin/bash
# Script de EMERGÊNCIA para remover a função de auditoria via NPX
echo "================================================="
echo "   ROLLBACK DE EMERGÊNCIA - AUDITORIA (SIA)      "
echo "================================================="
echo ""
echo "ATENÇÃO: Este comando irá APAGAR a função 'exportAuditData' da nuvem."
echo "O painel de auditoria deixará de funcionar imediatamente."
echo ""
read -p "Tem certeza que deseja continuar? (s/n): " confirm

if [[ $confirm == [sS] || $confirm == [sS][yY] ]]; then
    echo "Removendo função..."
    npx -y supabase functions delete exportAuditData --no-verify-jwt
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ SUCESSO! A função foi removida e o sistema voltou ao estado anterior."
    else
        echo ""
        echo "❌ FALHA ao remover. Verifique sua conexão ou login."
    fi
else
    echo "Operação cancelada."
fi
