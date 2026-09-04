import { PrismaClient, PapelSistema, StatusProjeto, StatusDespesa } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PREFIXOS = [
  'Desenvolvimento de', 'Estudo de', 'Análise de', 'Implementação de',
  'Projeto de', 'Pesquisa sobre', 'Avaliação de', 'Monitoramento de',
  'Planejamento de', 'Otimização de', 'Gestão de', 'Controle de',
  'Modelagem de', 'Simulação de', 'Síntese de', 'Identificação de',
];

const SUFIXOS = [
  'Sistemas de Energia Renovável', 'Redes de Distribuição Elétrica',
  'Eficiência Energética', 'Qualidade de Energia', 'Automação Industrial',
  'Sistemas Fotovoltaicos', 'Armazenamento de Energia', 'Smart Grids',
  'Veículos Elétricos', 'Microredes', 'Eletrônica de Potência',
  'Máquinas Elétricas', 'Eletrificação Rural', 'Termoelectricidade',
  'Eólica Offshore', 'Hidrelétricas de Pequeno Porte',
];

const RUBRICAS_BASE = [
  { nome: 'Recursos Humanos', categoria: 'RECURSOS_HUMANOS', percentual: 40 },
  { nome: 'Serviços de Terceiros', categoria: 'SERVICOS_TERCEIROS', percentual: 20 },
  { nome: 'Materiais de Consumo', categoria: 'MATERIAIS_CONSUMO', percentual: 10 },
  { nome: 'Materiais Permanentes', categoria: 'MATERIAIS_PERMANENTES', percentual: 15 },
  { nome: 'Viagens e Estadias', categoria: 'VIAGENS_DIARIAS', percentual: 5 },
  { nome: 'Custos Administrativos', categoria: 'CUSTOS_ADMINISTRATIVOS', percentual: 10 },
];

const MILESTONE_NAMES = [
  'Fase 1 - Levantamento e Diagnóstico',
  'Fase 2 - Planejamento e Projeto',
  'Fase 3 - Desenvolvimento',
  'Fase 4 - Implementação e Testes',
  'Fase 5 - Validação e Relatório Final',
];

const DESPESA_DESCRIPTIONS = [
  'Compra de equipamentos de laboratório',
  'Contratação de consultoria técnica',
  'Serviços de manutenção preventiva',
  'Aquisição de material de consumo',
  'Passagem aérea para conferência',
  'Hospedagem em evento técnico',
  'Aluguel de equipamentos especiais',
  'Serviços de processamento de dados',
  'Compra de software licenciado',
  'Material de escritório e impressão',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTitle(): string {
  return `${randomChoice(PREFIXOS)} ${randomChoice(SUFIXOS)}`;
}

function generateProjectCode(index: number, year: number): string {
  return `PDI-${year}-${String(index).padStart(3, '0')}`;
}

function randomDate(year: number, month: number): Date {
  const day = randomInt(1, 28);
  return new Date(year, month - 1, day);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function randomRubricas(budget: number): Array<{ nome: string; categoria: string; valorAlocado: number }> {
  const variations = RUBRICAS_BASE.map((r) => ({
    ...r,
    adjusted: r.percentual + randomInt(-5, 5),
  }));

  const total = variations.reduce((sum, r) => sum + r.adjusted, 0);
  return variations.map((r) => ({
    nome: r.nome,
    categoria: r.categoria,
    valorAlocado: Math.round((budget * r.adjusted) / total),
  }));
}

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  console.log('📧 Criando usuários...');
  const senhaHashed = await bcrypt.hash('senha123', 12);
  const adminHash = await bcrypt.hash('admin123', 12);

  const userData = [
    { nome: 'Administrador', email: 'admin@fluxfin.com', senha: adminHash, papelSistema: PapelSistema.ADMIN },
    { nome: 'Coordenador 1', email: 'coord1@fluxfin.com', senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
    { nome: 'Coordenador 2', email: 'coord2@fluxfin.com', senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
    { nome: 'Coordenador 3', email: 'coord3@fluxfin.com', senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
    { nome: 'Pesquisador 1', email: 'pesq1@fluxfin.com', senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
    { nome: 'Pesquisador 2', email: 'pesq2@fluxfin.com', senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
    { nome: 'Pesquisador 3', email: 'pesq3@fluxfin.com', senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
    { nome: 'Bolsista 1', email: 'bols1@fluxfin.com', senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
    { nome: 'Bolsista 2', email: 'bols2@fluxfin.com', senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
    { nome: 'Bolsista 3', email: 'bols3@fluxfin.com', senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
  ];

  const users = [];
  for (const u of userData) {
    const user = await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
    users.push(user);
  }

  const admin = users[0];
  const coordenadores = users.slice(1, 4);
  const pesquisadores = users.slice(4, 7);
  const bolsistas = users.slice(7, 10);

  console.log(`✅ ${users.length} usuários criados`);

  console.log('\n📋 Criando 100 projetos...');
  const statusPool: StatusProjeto[] = [StatusProjeto.ATIVO, StatusProjeto.CONCLUIDO, StatusProjeto.SUSPENSO];

  const projects = [];
  for (let i = 1; i <= 100; i++) {
    const year = randomInt(2022, 2026);
    const month = randomInt(1, 12);
    const duration = randomChoice([12, 24, 36, 48]);
    const startDate = randomDate(year, month);
    const endDate = addMonths(startDate, duration);
    const budget = randomInt(3000000, 5000000);

    const project = await prisma.projeto.create({
      data: {
        codigo: generateProjectCode(i, year),
        titulo: generateTitle(),
        descricao: `Projeto de pesquisa e desenvolvimento na área de energia elétrica, com duração de ${duration} meses.`,
        dataInicio: startDate,
        dataTermino: endDate,
        orcamentoGlobal: budget,
        status: randomChoice(statusPool),
      },
    });

    projects.push({ ...project, budget, duration, startDate, endDate });
  }

  console.log('✅ 100 projetos criados');

  console.log('\n💰 Criando rubricas para cada projeto...');
  for (const project of projects) {
    const rubricas = randomRubricas(project.budget);
    await prisma.rubrica.createMany({
      data: rubricas.map((r) => ({
        projetoId: project.id,
        nome: r.nome,
        categoria: r.categoria,
        valorAlocado: r.valorAlocado,
      })),
    });
  }

  console.log('✅ Rubricas criadas para todos os projetos');

  console.log('\n👥 Criando equipes para cada projeto...');
  let coordIndex = 0;
  let pesqIndex = 0;
  let bolsIndex = 0;

  const teamEntries: Array<{ projetoId: string; usuarioId: string; papel: string }> = [];

  for (const project of projects) {
    const coordenador = coordenadores[coordIndex % coordenadores.length];
    coordIndex++;
    teamEntries.push({ projetoId: project.id, usuarioId: coordenador.id, papel: 'COORDENADOR' });

    const numPesq = randomInt(2, 4);
    for (let j = 0; j < numPesq; j++) {
      const pesq = pesquisadores[pesqIndex % pesquisadores.length];
      teamEntries.push({ projetoId: project.id, usuarioId: pesq.id, papel: 'PESQUISADOR' });
      pesqIndex++;
    }

    const numBols = randomInt(1, 3);
    for (let j = 0; j < numBols; j++) {
      const bols = bolsistas[bolsIndex % bolsistas.length];
      teamEntries.push({ projetoId: project.id, usuarioId: bols.id, papel: 'BOLSISTA' });
      bolsIndex++;
    }
  }

  const uniqueTeams = new Map<string, typeof teamEntries[0]>();
  for (const entry of teamEntries) {
    const key = `${entry.projetoId}-${entry.usuarioId}`;
    if (!uniqueTeams.has(key)) {
      uniqueTeams.set(key, entry);
    }
  }

  const teamData = Array.from(uniqueTeams.values());
  for (const t of teamData) {
    await prisma.equipeProjeto.create({
      data: {
        projetoId: t.projetoId,
        usuarioId: t.usuarioId,
        papel: t.papel as any,
      },
    });
  }

  console.log(`✅ ${teamData.length} membros de equipe criados`);

  console.log('\n📊 Criando despesas para 30% dos projetos...');
  const allRubrics = await prisma.rubrica.findMany();
  const rubricsByProject = new Map<string, typeof allRubrics>();
  for (const r of allRubrics) {
    if (!rubricsByProject.has(r.projetoId)) {
      rubricsByProject.set(r.projetoId, []);
    }
    rubricsByProject.get(r.projetoId)!.push(r);
  }

  const projectsWithExpenses = projects.filter(() => Math.random() < 0.3);
  let totalExpenses = 0;

  for (const project of projectsWithExpenses) {
    const rubrics = rubricsByProject.get(project.id) || [];
    const expenseUser = randomChoice([admin, ...coordenadores]);

    for (const rubric of rubrics) {
      const maxForRubric = Number(rubric.valorAlocado);
      const numExpenses = randomInt(1, 4);
      let remaining = maxForRubric;

      for (let e = 0; e < numExpenses && remaining > 0; e++) {
        const maxValue = Math.min(remaining * 0.6, remaining);
        const value = randomInt(Math.round(maxValue * 0.1), Math.round(maxValue));
        if (value <= 0) continue;

        const expenseMonth = randomInt(0, project.duration - 1);
        const expenseDate = addMonths(project.startDate, expenseMonth);

        const statuses: StatusDespesa[] = [
          StatusDespesa.PENDENTE,
          StatusDespesa.APROVADA,
          StatusDespesa.PAGA,
        ];

        await prisma.despesa.create({
          data: {
            projetoId: project.id,
            rubricaId: rubric.id,
            usuarioId: expenseUser.id,
            descricao: randomChoice(DESPESA_DESCRIPTIONS),
            valor: value,
            dataDespesa: expenseDate,
            status: randomChoice(statuses),
          },
        });

        remaining -= value;
        totalExpenses++;
      }
    }
  }

  console.log(`✅ ${totalExpenses} despesas criadas em ${projectsWithExpenses.length} projetos`);

  console.log('\n🏁 Criando milestones para cada projeto...');
  let totalMilestones = 0;

  for (const project of projects) {
    const numMilestones = randomInt(3, 5);
    const milestoneNames = MILESTONE_NAMES.slice(0, numMilestones);
    const durationMonths = project.duration;

    for (let m = 0; m < numMilestones; m++) {
      const fraction = (m + 1) / numMilestones;
      const milestoneMonth = Math.round(durationMonths * fraction);
      const milestoneDate = addMonths(project.startDate, Math.min(milestoneMonth, durationMonths));
      const percentualPrevisto = Math.round((fraction * 100) * 100) / 100;

      const isCompleted = project.status === StatusProjeto.CONCLUIDO ||
        (project.status === StatusProjeto.ATIVO && Math.random() < fraction);

      await prisma.milestone.create({
        data: {
          projetoId: project.id,
          nome: milestoneNames[m],
          descricao: `Marco ${m + 1} do projeto: ${milestoneNames[m]}`,
          dataPrevista: milestoneDate,
          dataExecucao: isCompleted ? milestoneDate : null,
          percentualPrevisto,
        },
      });

      totalMilestones++;
    }
  }

  console.log(`✅ ${totalMilestones} milestones criados`);

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Resumo:`);
  console.log(`   👤 Usuários: ${users.length}`);
  console.log(`   📁 Projetos: ${projects.length}`);
  console.log(`   💰 Rubricas: ${projects.length * 6}`);
  console.log(`   👥 Equipes: ${teamData.length}`);
  console.log(`   📝 Despesas: ${totalExpenses}`);
  console.log(`   🏁 Milestones: ${totalMilestones}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
