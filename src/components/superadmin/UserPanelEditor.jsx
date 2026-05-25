import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { getAllPanels } from "@/lib/panelResolver";

const AppUser = base44.entities.AppUser;

export default function UserPanelEditor({ user, onClose, onSaved }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const allPanels = getAllPanels();

  useEffect(() => {
    setSelected(Array.isArray(user?.enabled_panels) ? user.enabled_panels : []);
  }, [user]);

  const toggle = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await AppUser.update(user.id, { enabled_panels: selected });
      toast.success("Painéis atualizados com sucesso!");
      onSaved?.({ ...user, enabled_panels: selected });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-yellow-600 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {user.full_name || "Sem nome"}
                </div>
                <div className="text-xs text-gray-400 truncate">{user.email}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lista de painéis */}
          <div className="px-5 py-4 overflow-y-auto space-y-2">
            <p className="text-xs text-gray-400 mb-3">
              Selecione os painéis que este usuário poderá acessar:
            </p>
            {allPanels.map((panel) => {
              const checked = selected.includes(panel.key);
              return (
                <label
                  key={panel.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    checked
                      ? "bg-emerald-500/10 border-emerald-500/40"
                      : "bg-gray-800/40 border-gray-700/60 hover:border-gray-600"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(panel.key)}
                    className="border-gray-600"
                  />
                  <div className={`w-9 h-9 rounded-lg ${panel.iconColor} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {panel.title}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {panel.description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {selected.length} painel(éis) habilitado(s)
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}