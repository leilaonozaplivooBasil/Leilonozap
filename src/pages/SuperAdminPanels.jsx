import React, { useState, useEffect, useMemo } from "react";
import { Search, Crown, Settings, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { resolveUserPanels } from "@/lib/panelResolver";
import UserPanelEditor from "@/components/superadmin/UserPanelEditor";

const AppUser = base44.entities.AppUser;

export default function SuperAdminPanels() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await AppUser.list("-created_date", 500);
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      return (
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.cpf || "").toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const handleSaved = (updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-6 px-4 sm:py-10 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-xl">
            <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Gestão de Painéis
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Habilite ou revogue acesso a painéis específicos para cada usuário.
            </p>
          </div>
        </div>

        {/* Busca */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou CPF..."
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Carregando usuários...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-700/60 bg-gray-900/40">
              <div className="col-span-4">Usuário</div>
              <div className="col-span-3">E-mail</div>
              <div className="col-span-4">Painéis Ativos</div>
              <div className="col-span-1 text-right">Ações</div>
            </div>

            <div className="divide-y divide-gray-800">
              {filtered.map((u) => {
                const panels = resolveUserPanels(u);
                const isExplicit = Array.isArray(u.enabled_panels) && u.enabled_panels.length > 0;
                return (
                  <div
                    key={u.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 px-4 py-3 hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="sm:col-span-4">
                      <div className="text-sm font-semibold text-white truncate">
                        {u.full_name || "Sem nome"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {u.role || "user"}
                        {u.is_seller && " · vendedor"}
                      </div>
                    </div>
                    <div className="sm:col-span-3 text-sm text-gray-300 truncate">
                      {u.email}
                    </div>
                    <div className="sm:col-span-4 flex flex-wrap gap-1.5">
                      {panels.length === 0 ? (
                        <span className="text-xs text-gray-500 italic">Nenhum</span>
                      ) : (
                        panels.map((p) => (
                          <Badge
                            key={p.key}
                            variant="outline"
                            className="text-xs border-gray-700 text-gray-300 bg-gray-800/60"
                          >
                            {p.title}
                          </Badge>
                        ))
                      )}
                      {!isExplicit && panels.length > 0 && (
                        <Badge className="text-[10px] bg-amber-600/20 text-amber-300 border-amber-700/40">
                          auto
                        </Badge>
                      )}
                    </div>
                    <div className="sm:col-span-1 sm:text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(u)}
                        className="border-gray-700 hover:border-emerald-500/40 hover:bg-emerald-500/10"
                      >
                        <Settings className="w-3.5 h-3.5 sm:mr-0 mr-1.5" />
                        <span className="sm:hidden">Editar</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500">
          <strong className="text-amber-400">auto</strong> = painéis derivados
          automaticamente do papel/carreira. Edite para fixar manualmente.
        </div>
      </div>

      {/* Modal de edição */}
      {editing && (
        <UserPanelEditor
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}