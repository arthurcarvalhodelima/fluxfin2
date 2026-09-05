import { prisma } from './prisma';

interface Activity {
  id: string;
  nome: string;
  predecessorIds: string[];
  duracao: number;
  dataInicio: Date;
  dataTermino: Date;
}

interface CPMResult {
  caminhoCritico: string[];
  duracaoTotal: number;
  folgas: Record<string, number>;
  atividades: Activity[];
}

export async function calcularCaminhoCritico(projetoId: string): Promise<CPMResult> {
  const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
  if (!projeto) {
    return { caminhoCritico: [], duracaoTotal: 0, folgas: {}, atividades: [] };
  }

  const milestones = await prisma.milestone.findMany({
    where: { projetoId },
    orderBy: { dataPrevista: 'asc' }
  });

  if (milestones.length === 0) {
    return { caminhoCritico: [], duracaoTotal: 0, folgas: {}, atividades: [] };
  }

  const activities: Activity[] = milestones.map((m, index) => {
    const duracaoMs = new Date(m.dataPrevista).getTime() - new Date(projeto.dataInicio).getTime();
    const duracao = Math.max(1, Math.ceil(duracaoMs / (1000 * 60 * 60 * 24)));

    return {
      id: m.id,
      nome: m.nome,
      predecessorIds: index > 0 ? [milestones[index - 1].id] : [],
      duracao,
      dataInicio: index === 0 ? new Date(projeto.dataInicio) : milestones[index - 1].dataPrevista,
      dataTermino: new Date(m.dataPrevista),
    };
  });

  const es: Record<string, number> = {};
  const ef: Record<string, number> = {};

  for (const activity of activities) {
    if (activity.predecessorIds.length === 0) {
      es[activity.id] = 0;
    } else {
      es[activity.id] = Math.max(...activity.predecessorIds.map(pid => ef[pid] || 0));
    }
    ef[activity.id] = es[activity.id] + activity.duracao;
  }

  const duracaoTotal = Math.max(...Object.values(ef));
  const ls: Record<string, number> = {};
  const lf: Record<string, number> = {};
  const folgas: Record<string, number> = {};

  for (const activity of [...activities].reverse()) {
    const successors = activities.filter(a => a.predecessorIds.includes(activity.id));
    if (successors.length === 0) {
      lf[activity.id] = duracaoTotal;
    } else {
      lf[activity.id] = Math.min(...successors.map(s => ls[s.id]));
    }
    ls[activity.id] = lf[activity.id] - activity.duracao;
    folgas[activity.id] = ls[activity.id] - es[activity.id];
  }

  const caminhoCritico = activities
    .filter(a => folgas[a.id] === 0)
    .map(a => a.id);

  return {
    caminhoCritico,
    duracaoTotal,
    folgas,
    atividades: activities,
  };
}
