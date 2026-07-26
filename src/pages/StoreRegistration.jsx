import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Upload, CheckCircle, Share2, Edit2, Trash2, Lock, Unlock, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const StoreEntity = base44.entities.Store;
const AppUser = base44.entities.AppUser;
const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function StoreRegistration() {
  const [formData, setFormData] = useState({
    store_name: "",
    owner_name: "",
    email: "",
    phone: "",
    cnpj: "",
    address: "",
    product_types: [],
    distribution_channels: [],
    logo_url: "",
    store_login: "",
    store_password: "",
    notes: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [editingStore, setEditingStore] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const savedUserJSON = localStorage.getItem('currentUser');
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');

        let userFound = null;

        if (savedUserJSON && isLoggedIn) {
          const userFromStorage = JSON.parse(savedUserJSON);
          try {
            const usersInDB = await AppUser.filter({ id: userFromStorage.id });
            if (usersInDB.length > 0) {
              userFound = usersInDB[0];
            }
          } catch (e) {
            console.error("Erro ao validar usuário:", e);
          }
        }

        if (!userFound) {
          try {
            const platformUser = await base44.auth.me();
            if (platformUser) {
              userFound = platformUser;
            }
          } catch (e) {
            console.log("Usuário não autenticado");
          }
        }

        if (userFound && userFound.email === MASTER_ADMIN_EMAIL) {
          userFound.role = 'admin';
        }

        if (!userFound || userFound.role !== 'admin' && userFound.role !== 'super_admin') {
          toast.error("Acesso negado. Apenas administradores podem registrar lojistas.");
          navigate(createPageUrl("Home"));
          return;
        }

        setCurrentUser(userFound);
        loadStores();
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
        toast.error("Erro ao verificar permissões");
        navigate(createPageUrl("Home"));
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [navigate]);

  const loadStores = async () => {
    try {
      const storesList = await StoreEntity.list("-created_date", 100);
      setStores(storesList);
    } catch (error) {
      console.error("Erro ao carregar lojistas:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleShareLoginLink = () => {
    const loginUrl = `${window.location.origin}${createPageUrl("LojistaDashboard")}`;

    if (navigator.share) {
      navigator.share({
        title: "Portal do Lojista",
        text: "Acesse o portal do lojista",
        url: loginUrl
      }).catch(() => {
        navigator.clipboard.writeText(loginUrl);
        toast.success("Link copiado para a área de transferência!");
      });
    } else {
      navigator.clipboard.writeText(loginUrl);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  const handleEditStore = (store) => {
    setEditingStore(store);
    setShowEditModal(true);
  };

  const handleUpdateStore = async (e) => {
    e.preventDefault();

    try {
      const updateData = { ...editingStore };

      // 🔒 Se a senha foi alterada, hashear antes de salvar
      if (updateData.store_password && !updateData.store_password.startsWith('$2')) {
        try {
          const hashResponse = await base44.functions.invoke('hashStorePassword', {
            password: updateData.store_password
          });
          const hashResult = hashResponse?.data || hashResponse;
          if (hashResult?.success && hashResult?.hashed_password) {
            updateData.store_password = hashResult.hashed_password;
          }
        } catch (hashErr) {
          console.warn('Erro ao hashear senha na edição:', hashErr);
        }
      }

      await StoreEntity.update(editingStore.id, updateData);
      toast.success("Lojista atualizado com sucesso!");
      setShowEditModal(false);
      setEditingStore(null);
      loadStores();
    } catch (error) {
      console.error("Erro ao atualizar lojista:", error);
      toast.error("Erro ao atualizar lojista");
    }
  };

  const handleDeleteStore = async (storeId) => {
    if (!confirm("Tem certeza que deseja excluir este lojista?")) return;

    try {
      await StoreEntity.delete(storeId);
      toast.success("Lojista excluído com sucesso!");
      loadStores();
    } catch (error) {
      console.error("Erro ao excluir lojista:", error);
      toast.error("Erro ao excluir lojista");
    }
  };



  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, logo_url: file_url }));
      setLogoFile(file);
      toast.success("Logo enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar logo:", error);
      toast.error("Erro ao enviar logo");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.store_name || !formData.owner_name || !formData.email || !formData.phone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!formData.store_login || !formData.store_password) {
      toast.error("Configure o login e senha de acesso do lojista");
      return;
    }

    setIsSubmitting(true);

    try {
      const storeData = {
        ...formData,
        can_create_sai_de_baixo: false,
        can_create_direto_fabrica: false,
        can_create_arremate_devolucoes: false,
        status: "active"
      };

      // 🔒 Hashear senha antes de salvar no banco
      try {
        const hashResponse = await base44.functions.invoke('hashStorePassword', {
          password: formData.store_password
        });
        const hashResult = hashResponse?.data || hashResponse;
        if (hashResult?.success && hashResult?.hashed_password) {
          storeData.store_password = hashResult.hashed_password;
        }
      } catch (hashErr) {
        console.warn('Erro ao hashear senha, salvando como texto puro (fallback):', hashErr);
      }

      await StoreEntity.create(storeData);

      toast.success("Loja registrada e ativada com sucesso!");

      // Limpar formulário e recarregar lista
      setFormData({
        store_name: "",
        owner_name: "",
        email: "",
        phone: "",
        cnpj: "",
        address: "",
        product_types: [],
        distribution_channels: [],
        logo_url: "",
        store_login: "",
        store_password: "",
        notes: ""
      });

      loadStores();
    } catch (error) {
      console.error("Erro ao registrar loja:", error);
      toast.error("Erro ao registrar loja. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Store className="w-10 h-10 text-green-400" />
            <h1 className="text-4xl font-bold text-white">Registro de Lojista</h1>
          </div>
          <p className="text-gray-400">Cadastre sua loja e comece a vender em nossos canais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados da Loja */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Dados da Loja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Nome da Loja *</Label>
                  <Input
                    value={formData.store_name}
                    onChange={(e) => handleInputChange("store_name", e.target.value)}
                    placeholder="Ex: Minha Loja LTDA"
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Nome do Proprietário *</Label>
                  <Input
                    value={formData.owner_name}
                    onChange={(e) => handleInputChange("owner_name", e.target.value)}
                    placeholder="Ex: João Silva"
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="contato@minhaloja.com"
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Telefone *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300">CNPJ</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange("cnpj", e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>


              </div>

              <div>
                <Label className="text-gray-300">Endereço Completo</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Rua, número, bairro, cidade, estado"
                  className="bg-gray-900 border-gray-700 text-white"
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Logo da Loja</Label>
                <div className="flex items-center gap-4">
                  {formData.logo_url && (
                    <img src={formData.logo_url} alt="Logo" className="w-20 h-20 object-cover rounded-lg border-2 border-green-500" />
                  )}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Enviar Logo</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acesso ao Portal (Apenas Admin) */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Acesso ao Portal do Lojista</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleShareLoginLink}
                  className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar Link
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 mb-4">
                <p className="text-green-400 text-sm">
                  <KeyRound className="w-3.5 h-3.5 inline mr-1.5" /><strong>Configuração de Acesso:</strong> Defina o login e senha que o lojista usará para acessar o portal.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Login de Acesso *</Label>
                  <Input
                    value={formData.store_login || ""}
                    onChange={(e) => handleInputChange("store_login", e.target.value)}
                    placeholder="Ex: minhaloja"
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Senha de Acesso *</Label>
                  <Input
                    type="password"
                    value={formData.store_password || ""}
                    onChange={(e) => handleInputChange("store_password", e.target.value)}
                    placeholder="Senha forte"
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Informações adicionais sobre sua loja..."
                className="bg-gray-900 border-gray-700 text-white"
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Botão de Envio */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Home"))}
              className="flex-1 border-gray-600 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                "Registrando..."
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Registrar Loja
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Lista de Lojistas Registrados */}
        <Card className="bg-gray-800 border-gray-700 mt-8">
          <CardHeader>
            <CardTitle className="text-white">Lojistas Registrados ({stores.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhum lojista registrado ainda</p>
            ) : (
              <div className="space-y-4">
                {stores.map((store) => (
                  <div key={store.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {store.logo_url && (
                            <img src={store.logo_url} alt={store.store_name} className="w-12 h-12 rounded-lg object-cover" />
                          )}
                          <div>
                            <h3 className="text-white font-semibold text-lg">{store.store_name}</h3>
                            <p className="text-gray-400 text-sm">{store.owner_name}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                          <div>
                            <span className="text-gray-500">Email:</span>
                            <span className="text-gray-300 ml-2">{store.email}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Telefone:</span>
                            <span className="text-gray-300 ml-2">{store.phone}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Login:</span>
                            <span className="text-gray-300 ml-2">{store.store_login}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Status:</span>
                            <Badge className={store.status === 'active' ? 'bg-green-600 ml-2' : 'bg-yellow-600 ml-2'}>
                              {store.status === 'active' ? 'Ativo' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditStore(store)}
                          className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteStore(store.id)}
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Edição */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Lojista</DialogTitle>
            </DialogHeader>

            {editingStore && (
              <form onSubmit={handleUpdateStore} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Nome da Loja</Label>
                    <Input
                      value={editingStore.store_name}
                      onChange={(e) => setEditingStore({ ...editingStore, store_name: e.target.value })}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Proprietário</Label>
                    <Input
                      value={editingStore.owner_name}
                      onChange={(e) => setEditingStore({ ...editingStore, owner_name: e.target.value })}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Email</Label>
                    <Input
                      type="email"
                      value={editingStore.email}
                      onChange={(e) => setEditingStore({ ...editingStore, email: e.target.value })}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Telefone</Label>
                    <Input
                      value={editingStore.phone}
                      onChange={(e) => setEditingStore({ ...editingStore, phone: e.target.value })}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Login de Acesso</Label>
                    <Input
                      value={editingStore.store_login}
                      onChange={(e) => setEditingStore({ ...editingStore, store_login: e.target.value })}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Nova Senha (deixe em branco para manter)</Label>
                    <Input
                      type="password"
                      placeholder="Nova senha"
                      onChange={(e) => setEditingStore({ ...editingStore, store_password: e.target.value || editingStore.store_password })}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Status de Acesso</Label>
                    <div className="flex gap-3 mt-2">
                      <Button
                        type="button"
                        onClick={() => setEditingStore({ ...editingStore, status: 'active' })}
                        className={editingStore.status === 'active' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'}
                      >
                        <Unlock className="w-4 h-4 mr-2" />
                        Ativo (Acesso Liberado)
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setEditingStore({ ...editingStore, status: 'inactive' })}
                        className={editingStore.status === 'inactive' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Inativo (Acesso Bloqueado)
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Endereço</Label>
                  <Textarea
                    value={editingStore.address || ""}
                    onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                    rows={2}
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Observações</Label>
                  <Textarea
                    value={editingStore.notes || ""}
                    onChange={(e) => setEditingStore({ ...editingStore, notes: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 border-gray-600 text-gray-300"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}