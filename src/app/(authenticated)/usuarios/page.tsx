"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DataTable, { Column } from "@/components/DataTable";
import Badge from "@/components/Badge";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  papelSistema: string;
  ativo: boolean;
  criadoEm: string;
}

type ConfirmAction = {
  type: "toggle" | "delete";
  usuario: Usuario;
};

export default function UsuariosPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: ConfirmAction | null;
  }>({ isOpen: false, action: null });
  const [processing, setProcessing] = useState(false);

  const isAdmin = session?.user?.papelSistema === "ADMIN";

  const fetchUsuarios = () => {
    fetch("/api/usuarios")
      .then((res) => res.json())
      .then((json) => {
        setUsuarios(json.usuarios || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleToggleActive = async () => {
    if (!confirmDialog.action) return;
    const { usuario } = confirmDialog.action;
    setProcessing(true);

    try {
      await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !usuario.ativo }),
      });
      fetchUsuarios();
    } catch {
      // handle error
    } finally {
      setProcessing(false);
      setConfirmDialog({ isOpen: false, action: null });
    }
  };

  const handleDelete = async () => {
    if (!confirmDialog.action) return;
    const { usuario } = confirmDialog.action;
    setProcessing(true);

    try {
      await fetch(`/api/usuarios/${usuario.id}`, {
        method: "DELETE",
      });
      fetchUsuarios();
    } catch {
      // handle error
    } finally {
      setProcessing(false);
      setConfirmDialog({ isOpen: false, action: null });
    }
  };

  const confirm = confirmDialog.action;
  const isToggle = confirm?.type === "toggle";
  const toggleUser = isToggle ? confirm?.usuario : null;
  const deleteConfirm = !isToggle ? confirm?.usuario : null;

  const columns: Column<Usuario>[] = [
    { key: "nome", header: "Nome", sortable: true },
    { key: "email", header: "Email", sortable: true },
    {
      key: "papelSistema",
      header: "Papel",
      render: (item) => (
        <Badge variant={item.papelSistema === "ADMIN" ? "primary" : "default"}>
          {item.papelSistema}
        </Badge>
      ),
    },
    {
      key: "ativo",
      header: "Status",
      render: (item) => (
        <Badge variant={item.ativo ? "success" : "danger"}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "criadoEm",
      header: "Criado em",
      render: (item) => new Date(item.criadoEm).toLocaleDateString("pt-BR"),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        {isAdmin && (
          <button
            onClick={() => router.push("/usuarios/novo")}
            className="fluxfin-btn-primary"
          >
            Novo Usuário
          </button>
        )}
      </div>

      <DataTable
        data={usuarios}
        columns={columns}
        searchPlaceholder="Buscar por nome ou email..."
        actions={
          isAdmin
            ? (item) => {
                if (item.id === session?.user?.id) return null;
                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setConfirmDialog({
                          isOpen: true,
                          action: { type: "toggle", usuario: item },
                        })
                      }
                      className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        item.ativo
                          ? "text-danger hover:bg-danger/10"
                          : "text-primary-dark hover:bg-primary/10"
                      }`}
                    >
                      {item.ativo ? "Desativar" : "Ativar"}
                    </button>
                    {!item.ativo && (
                      <button
                        onClick={() =>
                          setConfirmDialog({
                            isOpen: true,
                            action: { type: "delete", usuario: item },
                          })
                        }
                        className="text-sm px-3 py-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                );
              }
            : undefined
        }
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={isToggle ? handleToggleActive : handleDelete}
        title={
          isToggle
            ? toggleUser?.ativo
              ? "Desativar Usuário"
              : "Ativar Usuário"
            : "Excluir Usuário"
        }
        message={
          isToggle
            ? `Tem certeza que deseja ${
                toggleUser?.ativo ? "desativar" : "ativar"
              } o usuário "${toggleUser?.nome}"?`
            : `Tem certeza que deseja excluir permanentemente o usuário "${deleteConfirm?.nome}"? Esta ação não pode ser desfeita.`
        }
        confirmLabel={
          isToggle
            ? toggleUser?.ativo
              ? "Desativar"
              : "Ativar"
            : "Excluir"
        }
        variant={isToggle ? (toggleUser?.ativo ? "danger" : "warning") : "danger"}
        loading={processing}
      />
    </div>
  );
}
