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

export default function UsuariosPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    usuario: Usuario | null;
  }>({ isOpen: false, usuario: null });
  const [toggling, setToggling] = useState(false);

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
    if (!confirmDialog.usuario) return;
    setToggling(true);

    try {
      await fetch(`/api/usuarios/${confirmDialog.usuario.id}`, {
        method: "DELETE",
      });
      fetchUsuarios();
    } catch {
      // handle error
    } finally {
      setToggling(false);
      setConfirmDialog({ isOpen: false, usuario: null });
    }
  };

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
        <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
        {isAdmin && (
          <button
            onClick={() => router.push("/usuarios/novo")}
            className="fluxfin-btn-primary"
          >
            Novo Usuario
          </button>
        )}
      </div>

      <DataTable
        data={usuarios}
        columns={columns}
        searchPlaceholder="Buscar por nome ou email..."
        actions={
          isAdmin
            ? (item) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setConfirmDialog({ isOpen: true, usuario: item })
                    }
                    className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      item.ativo
                        ? "text-danger hover:bg-danger/10"
                        : "text-primary-dark hover:bg-primary/10"
                    }`}
                  >
                    {item.ativo ? "Desativar" : "Ativar"}
                  </button>
                </div>
              )
            : undefined
        }
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, usuario: null })}
        onConfirm={handleToggleActive}
        title={confirmDialog.usuario?.ativo ? "Desativar Usuario" : "Ativar Usuario"}
        message={`Tem certeza que deseja ${
          confirmDialog.usuario?.ativo ? "desativar" : "ativar"
        } o usuario "${confirmDialog.usuario?.nome}"?`}
        confirmLabel={confirmDialog.usuario?.ativo ? "Desativar" : "Ativar"}
        variant={confirmDialog.usuario?.ativo ? "danger" : "warning"}
        loading={toggling}
      />
    </div>
  );
}
