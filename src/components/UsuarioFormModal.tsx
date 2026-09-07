"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";

interface UsuarioFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingUser?: { id: string; nome: string; email: string; papelSistema: string } | null;
}

export default function UsuarioFormModal({ isOpen, onClose, onSuccess, editingUser }: UsuarioFormModalProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papelSistema, setPapelSistema] = useState("USUARIO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!editingUser;

  useEffect(() => {
    if (isOpen) {
      if (editingUser) {
        setNome(editingUser.nome);
        setEmail(editingUser.email);
        setPapelSistema(editingUser.papelSistema);
        setSenha("");
      } else {
        setNome("");
        setEmail("");
        setPapelSistema("USUARIO");
        setSenha("");
      }
      setError("");
    }
  }, [isOpen, editingUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: Record<string, string> = { nome, email, papelSistema };
      if (senha) body.senha = senha;

      const url = isEditing ? `/api/usuarios/${editingUser.id}` : "/api/usuarios";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar usuário");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar usuário");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Usuário" : "Novo Usuário"}
      footer={
        <>
          <button onClick={onClose} className="fluxfin-btn-ghost">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !nome || !email || (!isEditing && !senha)}
            className="fluxfin-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </span>
            ) : isEditing ? "Salvar" : "Criar Usuário"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Nome"
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />

        <FormField
          label="Email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <FormField
          label={isEditing ? "Nova Senha" : "Senha"}
          type="password"
          placeholder={isEditing ? "Deixe vazio para manter a atual" : "Mínimo 6 caracteres"}
          minLength={6}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required={!isEditing}
        />

        <div className="space-y-1.5">
          <label className="fluxfin-label">Papel no Sistema</label>
          <select
            className="fluxfin-input"
            value={papelSistema}
            onChange={(e) => setPapelSistema(e.target.value)}
          >
            <option value="USUARIO">Usuário</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm font-medium">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
