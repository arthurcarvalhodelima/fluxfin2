"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import FormField from "@/components/FormField";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function NovoUsuarioPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papelSistema, setPapelSistema] = useState("USUARIO");

  const isAdmin = session?.user?.papelSistema === "ADMIN";

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">Acesso restrito a administradores</p>
        <button
          onClick={() => router.push("/usuarios")}
          className="fluxfin-btn-primary mt-4"
        >
          Voltar
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha, papelSistema }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao criar usuário");
      }

      router.push("/usuarios");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Novo Usuário</h1>
        <button onClick={() => router.back()} className="fluxfin-btn-ghost">
          Voltar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="fluxfin-card space-y-5">
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
          label="Senha"
          type="password"
          placeholder="Minimo 6 caracteres"
          minLength={6}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
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

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="fluxfin-btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="fluxfin-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando...
              </span>
            ) : (
              "Criar Usuário"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
