"use client";

import { useMemo } from "react";

interface Milestone {
  id: string;
  nome: string;
  descricao: string | null;
  dataPrevista: string;
  dataExecucao: string | null;
  percentualPrevisto: number;
  predecessorDe: { id: string; nome: string }[];
}

interface ProjectGanttChartProps {
  milestones: Milestone[];
  projectStart: string;
  projectEnd: string;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function generateMonths(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);
  while (current <= endMonth) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

export default function ProjectGanttChart({
  milestones,
  projectStart,
  projectEnd,
}: ProjectGanttChartProps) {
  const timeline = useMemo(() => {
    const start = new Date(projectStart);
    const end = new Date(projectEnd);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [projectStart, projectEnd]);

  const months = useMemo(
    () => generateMonths(timeline.start, timeline.end),
    [timeline]
  );

  const totalDays = useMemo(() => {
    const diff = timeline.end.getTime() - timeline.start.getTime();
    return Math.max(diff / (1000 * 60 * 60 * 24), 1);
  }, [timeline]);

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const todayOffset = useMemo(() => {
    const diff = today.getTime() - timeline.start.getTime();
    return (diff / (1000 * 60 * 60 * 24) / totalDays) * 100;
  }, [today, timeline, totalDays]);

  const milestoneData = useMemo(() => {
    const predecessorIds = new Set<string>();
    for (const m of milestones) {
      for (const pred of m.predecessorDe) {
        predecessorIds.add(pred.id);
      }
    }

    return milestones.map((m) => {
      const predecessorDates = m.predecessorDe.map((pred) => {
        const predMilestone = milestones.find((pm) => pm.id === pred.id);
        if (predMilestone?.dataExecucao) {
          return new Date(predMilestone.dataExecucao);
        }
        if (predMilestone) {
          return new Date(predMilestone.dataPrevista);
        }
        return new Date(projectStart);
      });

      const startDate =
        predecessorDates.length > 0
          ? new Date(Math.max(...predecessorDates.map((d) => d.getTime())))
          : new Date(projectStart);

      const endDate = m.dataExecucao
        ? new Date(m.dataExecucao)
        : new Date(m.dataPrevista);

      const startOffset = Math.max(
        (startDate.getTime() - timeline.start.getTime()) /
          (1000 * 60 * 60 * 24),
        0
      );
      const duration = endDate.getTime() - startDate.getTime();
      const barDays = Math.max(duration / (1000 * 60 * 60 * 24), 1);

      const leftPercent = (startOffset / totalDays) * 100;
      const widthPercent = (barDays / totalDays) * 100;

      const isCompleted = !!m.dataExecucao;
      const isStartDate = !predecessorIds.has(m.id);

      return {
        ...m,
        startDate,
        endDate,
        leftPercent,
        widthPercent,
        isCompleted,
        isStartDate,
      };
    });
  }, [milestones, projectStart, timeline, totalDays]);

  const statusConfig = {
    completed: { bar: "bg-success", label: "text-white", text: "Concluído" },
    inProgress: { bar: "bg-primary", label: "text-white", text: "Em andamento" },
    pending: { bar: "bg-gray-300", label: "text-gray-700", text: "Pendente" },
  };

  if (milestones.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="font-medium">Nenhum marco cadastrado</p>
        <p className="text-sm mt-1">
          Adicione marcos para visualizar o cronograma Gantt
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="flex border-b border-border">
          <div className="w-56 flex-shrink-0 px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide border-r border-border">
            Marco
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

        {milestoneData.map((m) => {
          const isCompleted = m.isCompleted;
          const now = new Date();
          const isInFuture = m.startDate > now;
          const isActive =
            !isCompleted && !isInFuture && m.endDate >= now;

          let barClass = statusConfig.pending.bar;
          let labelClass = statusConfig.pending.label;
          if (isCompleted) {
            barClass = statusConfig.completed.bar;
            labelClass = statusConfig.completed.label;
          } else if (isActive) {
            barClass = statusConfig.inProgress.bar;
            labelClass = statusConfig.inProgress.label;
          }

          return (
            <div
              key={m.id}
              className="flex border-b border-border hover:bg-surface-hover transition-colors"
            >
              <div className="w-56 flex-shrink-0 px-3 py-3 border-r border-border">
                <p className="text-sm font-medium text-foreground truncate">
                  {m.nome}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {m.startDate.toLocaleDateString("pt-BR")} →{" "}
                  {m.endDate.toLocaleDateString("pt-BR")}
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

                {todayOffset >= 0 && todayOffset <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-danger/60 z-10"
                    style={{ left: `${todayOffset}%` }}
                    title={`Hoje: ${today.toLocaleDateString("pt-BR")}`}
                  />
                )}

                <div
                  className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md overflow-hidden cursor-default group"
                  style={{
                    left: `${m.leftPercent}%`,
                    width: `${Math.max(m.widthPercent, 1.5)}%`,
                  }}
                  title={`${m.nome}\n${m.startDate.toLocaleDateString("pt-BR")} a ${m.endDate.toLocaleDateString("pt-BR")}\nPrevisto: ${m.percentualPrevisto}%\nStatus: ${isCompleted ? "Concluído" : isActive ? "Em andamento" : "Pendente"}`}
                >
                  <div
                    className={`h-full rounded-md ${barClass} transition-all duration-300`}
                  >
                    {isCompleted && (
                      <div className="h-full bg-white/30 rounded-md" />
                    )}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span
                      className={`text-[10px] font-semibold ${labelClass} drop-shadow-sm`}
                    >
                      {m.percentualPrevisto}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex border-t border-border bg-surface">
          <div className="w-56 flex-shrink-0 px-3 py-2 border-r border-border" />
          <div className="flex-1 relative py-2">
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
            <div className="flex items-center justify-between px-2 text-xs text-muted">
              <span>
                {timeline.start.toLocaleDateString("pt-BR")}
              </span>
              <span>
                {timeline.end.toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 px-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-success" />
          <span className="text-muted">Concluído</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-muted">Em andamento</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-300" />
          <span className="text-muted">Pendente</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-3 bg-danger/60" />
          <span className="text-muted">Hoje</span>
        </span>
      </div>
    </div>
  );
}
