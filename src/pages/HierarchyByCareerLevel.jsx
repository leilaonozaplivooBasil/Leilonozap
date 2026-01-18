import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Users } from "lucide-react";

const CAREER_LEVEL_ORDER = [
  "fundador",
  "conselheiro",
  "ceo",
  "diretoria",
  "diretor",
  "distribuidor",
  "plano_lojista",
  "plano_lider",
  "kit_start",
  "executivo",
  "licenciado_catalogo",
  "licenciado_aplicativo",
  "trainee",
  "usuario",
];

const CAREER_LEVEL_LABELS = {
  fundador: "👑 Fundador",
  conselheiro: "🎓 Conselheiro",
  ceo: "🔴 CEO",
  diretoria: "🏢 Diretoria",
  diretor: "📊 Diretor",
  distribuidor: "📦 Distribuidor",
  plano_lojista: "🛒 Plano Lojista",
  plano_lider: "⭐ Plano Líder",
  kit_start: "🚀 Kit Start",
  executivo: "💼 Executivo",
  licenciado_catalogo: "📱 Licenciado Catálogo",
  licenciado_aplicativo: "📲 Licenciado App",
  trainee: "🎯 Trainee",
  usuario: "👤 Usuário",
};

export default function HierarchyByCareerLevel() {
  const [allUsers, setAllUsers] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedUsers, setExpandedUsers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const users = await base44.entities.AppUser.list();
        setAllUsers(Array.isArray(users) ? users : []);
        
        // Expande grupos de cargo por padrão
        const defaultExpanded = {};
        CAREER_LEVEL_ORDER.forEach(level => {
          defaultExpanded[level] = true;
        });
        setExpandedGroups(defaultExpanded);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const usersByCareerLevel = {};
  CAREER_LEVEL_ORDER.forEach(level => {
    usersByCareerLevel[level] = allUsers.filter(u => {
      const levels = Array.isArray(u.career_levels) ? u.career_levels : [];
      return levels.includes(level);
    });
  });

  const getUserById = (id) => allUsers.find(u => u.id === id);
  
  const getIndicados = (userId) => {
    return allUsers.filter(u => u.referred_by_id === userId);
  };

  const toggleGroup = (level) => {
    setExpandedGroups(prev => ({ ...prev, [level]: !prev[level] }));
  };

  const toggleUser = (userId) => {
    setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  if (loading) {
    return <div className="p-8 text-white">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Hierarquia por Cargo</h1>
          <Badge className="bg-blue-600">{allUsers.length} usuários</Badge>
        </div>

        <div className="space-y-4">
          {CAREER_LEVEL_ORDER.map(level => {
            const users = usersByCareerLevel[level];
            if (users.length === 0) return null;

            const isExpanded = expandedGroups[level];

            return (
              <div key={level}>
                {/* GRUPO DE CARGO */}
                <button
                  onClick={() => toggleGroup(level)}
                  className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <h2 className="text-lg font-semibold">
                      {CAREER_LEVEL_LABELS[level]}
                    </h2>
                  </div>
                  <Badge className="bg-gray-600">{users.length}</Badge>
                </button>

                {/* USUÁRIOS DO GRUPO */}
                {isExpanded && (
                  <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-700 pl-4">
                    {users.map(user => {
                      const indicados = getIndicados(user.id);
                      const hasIndicados = indicados.length > 0;
                      const userExpanded = expandedUsers[user.id];

                      return (
                        <div key={user.id} className="space-y-2">
                          {/* USUÁRIO */}
                          <button
                            onClick={() => hasIndicados && toggleUser(user.id)}
                            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-3 flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {hasIndicados ? (
                                userExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-green-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-green-400" />
                                )
                              ) : (
                                <div className="w-4" />
                              )}
                              <div className="text-left">
                                <div className="font-semibold">{user.full_name}</div>
                                <div className="text-xs text-gray-400">{user.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasIndicados && (
                                <Badge className="bg-blue-600 text-xs">
                                  {indicados.length} indicados
                                </Badge>
                              )}
                              <Badge className="bg-green-600/30 text-green-300 text-xs">
                                V$ {Number(user.valora_pay_balance || 0).toFixed(2)}
                              </Badge>
                            </div>
                          </button>

                          {/* INDICADOS DO USUÁRIO */}
                          {hasIndicados && userExpanded && (
                            <div className="ml-6 space-y-1 border-l-2 border-green-600/50 pl-3">
                              {indicados.map(indicado => (
                                <div
                                  key={indicado.id}
                                  className="bg-gray-800/60 border border-green-600/30 rounded p-2 text-sm"
                                >
                                  <div className="font-semibold text-green-300">
                                    {indicado.full_name}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {indicado.email}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Cargos: {Array.isArray(indicado.career_levels) 
                                      ? indicado.career_levels.map(l => CAREER_LEVEL_LABELS[l]).join(", ")
                                      : "—"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}