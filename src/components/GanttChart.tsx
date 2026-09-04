"use client";

import { useMemo } from "react";

interface GanttProject {
  id: string;
  codigo: string;
  titulo: string;
  dataInicio: string;
  dataTermino: string;
  status: string;
  progresso: number;
}

interface GanttChartProps {
  projects: GanttProject[];
}

const statusColors: Record<string, { bar: string; label: string; bg: string }> = {
  ATIVO: { bar: "bg-primary", label: "text-white", bg: "bg-primary/10" },
  CONCLUIDO: { bar: "bg-success", label: "text-white", bg: "bg-success/10" },
  SUSPENSO: { bar: "bg-warning", label: "text-white", bg: "bg-warning/10" },
  CANCELADO: { bar: "bg-danger", label: "text-white", bg: "bg-danger/10" },
};

const statusLabels: Record<string, string> = {
  ATIVO: "Ativo",
  CONCLUIDO: "Concluido",
  SUSPENSO: "Suspenso",
  CANCELADO: "Cancelado",
};

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function getTimelineRange(projects: GanttProject[]) {
  if (projects.length === 0) {
    const now = new Date();
    return { start: now, end: now };
  }

  let minDate = new Date(projects[0].dataInicio);
  let maxDate = new Date(projects[0].dataTermino);

  for (const p of projects) {
    const start = new Date(p.dataInicio);
    const end = new Date(p.dataTermino);
    if (start < minDate) minDate = start;
    if (end > maxDate) maxDate = end;
  }

  minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

  return { start: minDate, end: maxDate };
}

function generateMonths(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

export default function GanttChart({ projects }: GanttChartProps) {
  const { start: timelineStart, end: timelineEnd } = useMemo(
    () => getTimelineRange(projects),
    [projects]
  );

  const months = useMemo(
    () => generateMonths(timelineStart, timelineEnd),
    [timelineStart, timelineEnd]
  );

  const totalDays = useMemo(() => {
    const diff = timelineEnd.getTime() - timelineStart.getTime();
    return Math.max(diff / (1000 * 60 * 60 * 24), 1);
  }, [timelineStart, timelineEnd]);

  if (projects.length === 0) {
    return (
      <div className="fluxfin-card text-center py-12">
        <p className="text-muted">Nenhum projeto para exibir no diagrama de Gantt.</p>
      </div>
    );
  }

  return (
    <div className="fluxfin-card overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Diagrama de Gantt
        </h2>
        <div className="flex items-center gap-3 text-xs">
          {Object.entries(statusLabels).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className={`w-3 h-3 rounded-sm ${statusColors[key]?.bar ?? "bg-muted"}`}
              />
              <span className="text-muted">{label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="flex border-b border-border">
            <div className="w-60 flex-shrink-0 px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide border-r border-border">
              Projeto
            </div>
            <div className="flex-1 flex">
              {months.map((month, i) => (
                <div
                  key={i}
                  className="flex-1 text-center py-2 text-xs font-medium text-muted border-r border-border last:border-r-0"
                >
                  {getMonthLabel(month)}
                </div>
              ))}
            </div>
          </div>

          {projects.map((project) => {
            const projStart = new Date(project.dataInicio);
            const projEnd = new Date(project.dataTermino);

            const startOffset =
              Math.max(
                (projStart.getTime() - timelineStart.getTime()) /
                  (1000 * 60 * 60 * 24),
                0
              );
            const effectiveStart = Math.max(
              projStart.getTime(),
              timelineStart.getTime()
            );
            const effectiveEnd = Math.min(
              projEnd.getTime(),
              timelineEnd.getTime()
            );
            const duration = effectiveEnd - effectiveStart;
            const barDays = Math.max(duration / (1000 * 60 * 60 * 24), 1);

            const leftPercent = (startOffset / totalDays) * 100;
            const widthPercent = (barDays / totalDays) * 100;

            const colors = statusColors[project.status] ?? statusColors.ATIVO;
            const progress = Math.min(Math.max(project.progresso, 0), 100);

            return (
              <div
                key={project.id}
                className="flex border-b border-border hover:bg-surface-hover transition-colors"
              >
                <div className="w-60 flex-shrink-0 px-3 py-3 border-r border-border">
                  <p className="text-sm font-medium text-foreground truncate">
                    {project.codigo}
                  </p>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {project.titulo}
                  </p>
                </div>
                <div className="flex-1 relative py-3">
                  {months.map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-r border-border/50 last:border-r-0"
                      style={{
                        left: `${(i / months.length) * 100}%`,
                        width: `${100 / months.length}%`,
                      }}
                    />
                  ))}

                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md overflow-hidden cursor-default group"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 2)}%`,
                    }}
                    title={`${project.codigo} - ${project.titulo}\n${new Date(project.dataInicio).toLocaleDateString("pt-BR")} a ${new Date(project.dataTermino).toLocaleDateString("pt-BR")}\nProgresso: ${progress}%`}
                  >
                    <div
                      className={`h-full rounded-md ${colors.bar} transition-all duration-300`}
                    >
                      <div
                        className="h-full bg-white/30 rounded-md"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className={`text-[10px] font-semibold ${colors.label} drop-shadow-sm`}>
                        {progress}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
