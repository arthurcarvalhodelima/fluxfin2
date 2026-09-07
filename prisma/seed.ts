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

const DESCRICOES_PROJETO = [
  'Projeto de P&D voltado para modernização da infraestrutura elétrica, incluindo estudos de viabilidade técnica e econômica, desenvolvimento de protótipos e validação em campo.',
  'Pesquisa aplicada em parceria com universidades federais, focada em soluções inovadoras para o setor elétrico com impacto na qualidade do serviço prestado aos consumidores.',
  'Estudo técnico detalhado para implantação de novas tecnologias na rede de distribuição, contemplando análise de risco, planejamento financeiro e cronograma de execução.',
  'Desenvolvimento de sistema inteligente de monitoramento e controle de rede, utilizing algoritmos de machine learning para previsão de falhas e otimização operacional.',
  'Projeto de eficiência energética em sistemas de distribuição, incluindo auditorias técnicas, substituição de equipamentos obsoletos e implantação de indicadores de desempenho.',
  'Implementação de solução de automação para subestações de distribuição, com foco em redução de perdas técnicas e melhoria da confiabilidade do suprimento.',
  'Estudo de viabilidade para implantação de geração distribuída em áreas rurais, incluindo análise de potencial solar e eólico e interligação com a rede existente.',
  'Pesquisa e desenvolvimento de sistema de armazenamento de energia para aplicação em redes de distribuição, visando suporte a picos de demanda e integração de fontes renováveis.',
];

const RUBRICAS_POR_CATEGORIA: Record<string, { nomes: string[]; percentual: number }> = {
  RECURSOS_HUMANOS: {
    nomes: [
      'Bolsas de Pesquisa',
      'Remuneração de Equipe Técnica',
      'Encargos Sociais e Trabalhistas',
      'Treimamento e Capacitação',
      'Diárias de Pesquisadores',
      'Estágios e Iniciação Científica',
      'Consultoria Especializada em RH',
    ],
    percentual: 40,
  },
  SERVICOS_TERCEIROS: {
    nomes: [
      'Subcontratação de Análises Laboratoriais',
      'Serviços de Consultoria Técnica Externa',
      'Manutenção de Software Especializado',
      'Serviços de Processamento de Dados',
      'Auditoria e Certificação Técnica',
      'Serviços de Campo e Coleta de Dados',
      'Suporte de Infraestrutura Terceirizada',
    ],
    percentual: 20,
  },
  MATERIAIS_CONSUMO: {
    nomes: [
      'Insumos para Laboratório',
      'Material Elétrico e Eletrônico',
      'Combustível e Lubrificantes',
      'Material de Escritório e Papelaria',
      'Componentes para Prototipagem',
      'Reagentes e Produtos Químicos',
      'Material de Proteção Individual',
    ],
    percentual: 10,
  },
  MATERIAIS_PERMANENTES: {
    nomes: [
      'Equipamentos de Medição e Ensaios',
      'Computadores e Periféricos',
      'Instrumentação Científica',
      'Móveis e Utensílios para Laboratório',
      'Servidores e Equipamentos de Rede',
      'Veículos para Apoio ao Projeto',
      'Módulos Fotovoltaicos e Conversores',
    ],
    percentual: 15,
  },
  VIAGENS_DIARIAS: {
    nomes: [
      'Deslocamento para Visita Técnica',
      'Participação em Eventos e Congressos',
      'Diárias para Trabalho de Campo',
      'Passagens Aéreas para Reuniões',
      'Hospedagem em Eventos Técnicos',
      'Transporte Local em Operações',
    ],
    percentual: 5,
  },
  CUSTOS_ADMINISTRATIVOS: {
    nomes: [
      'Infraestrutura e Energia do Laboratório',
      'Aluguel de Espaço Operacional',
      'Licenças de Software e Sistemas',
      'Seguro de Equipamentos e Projetos',
      'Despesas Bancárias e Financeiras',
      'Publicações e Relatórios Técnicos',
    ],
    percentual: 10,
  },
};

const MILESTONE_POOL = [
  { nome: 'Kickoff e Alinhamento Inicial', fase: 'inicio', percentual: 5 },
  { nome: 'Levantamento de Requisitos', fase: 'inicio', percentual: 10 },
  { nome: 'Diagnóstico da Situação Atual', fase: 'inicio', percentual: 8 },
  { nome: 'Estudo de Viabilidade Técnica', fase: 'planejamento', percentual: 15 },
  { nome: 'Planejamento Detalhado do Projeto', fase: 'planejamento', percentual: 12 },
  { nome: 'Definição da Arquitetura de Solução', fase: 'planejamento', percentual: 10 },
  { nome: 'Aprovação do Projeto Básico', fase: 'planejamento', percentual: 8 },
  { nome: 'Aquisição de Materiais e Equipamentos', fase: 'execucao', percentual: 10 },
  { nome: 'Desenvolvimento do Protótipo', fase: 'execucao', percentual: 15 },
  { nome: 'Implementação em Escala Piloto', fase: 'execucao', percentual: 12 },
  { nome: 'Integração com Sistemas Existentes', fase: 'execucao', percentual: 10 },
  { nome: 'Testes de Aceitação', fase: 'validacao', percentual: 8 },
  { nome: 'Treinamento da Equipe Operacional', fase: 'validacao', percentual: 5 },
  { nome: 'Relatório Técnico Parcial', fase: 'validacao', percentual: 7 },
  { nome: 'Validação em Condições Reais', fase: 'validacao', percentual: 10 },
  { nome: 'Entrega do Relatório Final', fase: 'encerramento', percentual: 5 },
  { nome: 'Revisão e Aprovação pela ANEEL', fase: 'encerramento', percentual: 5 },
  { nome: 'Encerramento e Transição', fase: 'encerramento', percentual: 3 },
];

const DESCRICOES_DESPESA = {
  RECURSOS_HUMANOS: [
    'Pagamento de bolsa de pesquisa - mês {mes}',
    'Remuneração de técnico de laboratório',
    'Horas extras da equipe de desenvolvimento',
    'Consultoria especializada em engenharia elétrica',
    'Estagiário de apoio ao projeto',
  ],
  SERVICOS_TERCEIROS: [
    'Serviços de análise laboratorial de materiais',
    'Contratação de empresa de auditoria técnica',
    'Serviços de medição e calibração de equipamentos',
    'Consultoria jurídica para regularização',
    'Serviços detopografia e levantamento georreferenciado',
    'Manutenção preventiva de equipamentos de campo',
  ],
  MATERIAIS_CONSUMO: [
    'Materiais elétricos para protótipo',
    'Componentes eletrônicos para desenvolvimento',
    'Material de escritório e consumíveis',
    'Insumos para testes laboratoriais',
    'Cabos, conectores e acessórios de instalação',
  ],
  MATERIAIS_PERMANENTES: [
    'Aquisição de medidor de qualidade de energia',
    'Compra de transformador de teste',
    'Aquisição de notebook para análise de dados',
    'Compra de equipamento de medição campométrico',
    'Aquisição de gerador de sinais para testes',
  ],
  VIAGENS_DIARIAS: [
    'Deslocamento para visita técnica em campo',
    'Diária para reunião com parceiro institucional',
    'Passagem aérea para congresso técnico',
    'Hospedagem para treinamento externo',
    'Deslocamento para inspeção de obra',
  ],
  CUSTOS_ADMINISTRATIVOS: [
    'Aluguel de espaço para reuniões',
    'Material de impressão e diagramação',
    'Serviços de internet e telefonia',
    'Seguro de equipamentos em trânsito',
    'Taxas bancárias e administrativas',
  ],
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChoiceN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function generateTitle(): string {
  return `${randomChoice(PREFIXOS)} ${randomChoice(SUFIXOS)}`;
}

function generateProjectCode(index: number, year: number): string {
  return `PDI-${year}-${String(index).padStart(3, '0')}`;
}

function randomDate(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function randomRubricas(budget: number): Array<{ nome: string; categoria: string; valorAlocado: number }> {
  const categorias = Object.keys(RUBRICAS_POR_CATEGORIA);
  const variations = categorias.map((cat) => {
    const base = RUBRICAS_POR_CATEGORIA[cat];
    return {
      nome: randomChoice(base.nomes),
      categoria: cat,
      percentual: base.percentual + randomInt(-5, 5),
    };
  });

  const total = variations.reduce((sum, r) => sum + r.percentual, 0);
  return variations.map((r) => ({
    nome: r.nome,
    categoria: r.categoria,
    valorAlocado: Math.round((budget * r.percentual) / total),
  }));
}

function calcularProgresso(milestones: Array<{ percentualPrevisto: number; dataExecucao: Date | null }>): number {
  if (milestones.length === 0) return 0;
  const concluidos = milestones.filter(m => m.dataExecucao !== null);
  if (concluidos.length === 0) return 0;
  const total = concluidos.reduce((sum, m) => sum + Number(m.percentualPrevisto), 0);
  return Math.min(Math.round(total * 100) / 100, 100);
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

  console.log('\n🧹 Limpando dados anteriores...');
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_check_coordenador ON "EquipeProjeto"');
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_prevent_auditlog_modification ON "AuditLog"');
  await prisma.auditLog.deleteMany();
  await prisma.documentoProjeto.deleteMany();
  await prisma.despesa.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.equipeProjeto.deleteMany();
  await prisma.rubrica.deleteMany();
  await prisma.projeto.deleteMany();
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_check_coordenador
        AFTER INSERT OR DELETE ON "EquipeProjeto"
        FOR EACH ROW
        EXECUTE FUNCTION check_coordenador_exists()
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_prevent_auditlog_modification
        BEFORE UPDATE OR DELETE ON "AuditLog"
        FOR EACH ROW
        EXECUTE FUNCTION prevent_auditlog_modification()
  `);
  console.log('✅ Dados anteriores removidos');

  console.log('\n📋 Criando 100 projetos...');
  const agora = new Date();
  const statusPool: StatusProjeto[] = [StatusProjeto.ATIVO, StatusProjeto.CONCLUIDO, StatusProjeto.SUSPENSO];

  const projects = [];
  for (let i = 1; i <= 100; i++) {
    const year = randomInt(2022, 2026);
    const month = randomInt(1, 12);
    const duration = randomChoice([12, 24, 36, 48]);
    const startDate = randomDate(year, month);
    const endDate = addMonths(startDate, duration);
    const budget = randomInt(3000000, 5000000);

    let status: StatusProjeto;
    if (endDate < agora) {
      status = randomChoice([StatusProjeto.CONCLUIDO, StatusProjeto.CONCLUIDO, StatusProjeto.SUSPENSO]);
    } else if (startDate > agora) {
      status = StatusProjeto.ATIVO;
    } else {
      status = randomChoice(statusPool);
    }

    const project = await prisma.projeto.create({
      data: {
        codigo: generateProjectCode(i, year),
        titulo: generateTitle(),
        descricao: randomChoice(DESCRICOES_PROJETO),
        dataInicio: startDate,
        dataTermino: endDate,
        orcamentoGlobal: budget,
        status,
        progressoFisico: 0,
      },
    });

    projects.push({ ...project, budget, duration, startDate, endDate, status });
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

  console.log('\n🏁 Criando milestones para cada projeto...');
  let totalMilestones = 0;
  const projectMilestones: Map<string, Array<{ id: string; percentualPrevisto: number; dataExecucao: Date | null; dataPrevista: Date }>> = new Map();

  for (const project of projects) {
    const numMilestones = randomInt(3, 7);
    const selectedMilestones = randomChoiceN(MILESTONE_POOL, numMilestones).sort((a, b) => {
      const faseOrder = { inicio: 0, planejamento: 1, execucao: 2, validacao: 3, encerramento: 4 };
      return faseOrder[a.fase as keyof typeof faseOrder] - faseOrder[b.fase as keyof typeof faseOrder];
    });

    const durationDays = Math.ceil((project.endDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const projectMilestoneData: Array<{ id: string; percentualPrevisto: number; dataExecucao: Date | null; dataPrevista: Date }> = [];
    let predecessorId: string | null = null;

    for (let m = 0; m < selectedMilestones.length; m++) {
      const ms = selectedMilestones[m];
      const fraction = (m + 1) / selectedMilestones.length;
      const daysFromStart = Math.round(durationDays * fraction) + randomInt(-15, 15);
      const milestoneDate = addDays(project.startDate, Math.max(30, Math.min(daysFromStart, durationDays - 5)));

      let isCompleted = false;
      let dataExecucao: Date | null = null;

      if (project.status === StatusProjeto.CONCLUIDO) {
        isCompleted = true;
        dataExecucao = addDays(milestoneDate, randomInt(-10, 5));
      } else if (project.status === StatusProjeto.ATIVO) {
        if (milestoneDate < agora) {
          isCompleted = Math.random() < 0.75;
          if (isCompleted) {
            dataExecucao = addDays(milestoneDate, randomInt(-5, 15));
          }
        }
      }

      const created = await prisma.milestone.create({
        data: {
          projetoId: project.id,
          nome: ms.nome,
          descricao: `${ms.nome} - ${project.codigo}`,
          dataPrevista: milestoneDate,
          dataExecucao,
          percentualPrevisto: ms.percentual,
        },
      });

      projectMilestoneData.push({
        id: created.id,
        percentualPrevisto: ms.percentual,
        dataExecucao,
        dataPrevista: milestoneDate,
      });

      totalMilestones++;
    }

    projectMilestones.set(project.id, projectMilestoneData);
  }

  console.log(`✅ ${totalMilestones} milestones criados`);

  console.log('\n💸 Criando despesas realistas...');
  const categorias = ['RECURSOS_HUMANOS', 'SERVICOS_TERCEIROS', 'MATERIAIS_CONSUMO', 'MATERIAIS_PERMANENTES', 'VIAGENS_DIARIAS', 'CUSTOS_ADMINISTRATIVOS'] as const;
  let totalDespesas = 0;

  for (const project of projects) {
    if (project.status === StatusProjeto.SUSPENSO && Math.random() < 0.5) continue;

    const rubricas = await prisma.rubrica.findMany({
      where: { projetoId: project.id, deletedAt: null },
    });

    const milestonesDoProjeto = projectMilestones.get(project.id) || [];
    const concluidos = milestonesDoProjeto.filter(m => m.dataExecucao !== null);

    const numDespesas = randomInt(5, 15);
    const despesasData: Array<{
      projetoId: string;
      rubricaId: string;
      usuarioId: string;
      descricao: string;
      valor: number;
      dataDespesa: Date;
      status: StatusDespesa;
      justificativa: string | null;
      dataAprovacao: Date | null;
      milestoneId: string | null;
    }> = [];

    for (let d = 0; d < numDespesas; d++) {
      const rubrica = randomChoice(rubricas);
      const categoria = categorias.find(c => c === rubrica.categoria) || 'CUSTOS_ADMINISTRATIVOS';
      const descricoes = DESCRICOES_DESPESA[categoria];
      let descricao = randomChoice(descricoes);
      descricao = descricao.replace('{mes}', `${randomInt(1, 12)}/${randomInt(2023, 2026)}`);

      const saldo = Number(rubrica.valorAlocado) - Number(rubrica.valorGasto);
      const maxValor = Math.min(saldo * 0.4, Number(rubrica.valorAlocado) * 0.15);
      if (maxValor < 1000) continue;

      const valor = randomInt(1000, Math.max(1001, Math.round(maxValor)));

      const daysFromStart = randomInt(0, Math.ceil((project.endDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const dataDespesa = addDays(project.startDate, daysFromStart);

      let status: StatusDespesa;
      let dataAprovacao: Date | null = null;
      const justificativaStatus = dataDespesa < agora;

      if (dataDespesa > agora) {
        status = StatusDespesa.PENDENTE;
      } else if (justificativaStatus) {
        const rand = Math.random();
        if (rand < 0.55) {
          status = StatusDespesa.PAGA;
          dataAprovacao = addDays(dataDespesa, randomInt(3, 30));
        } else if (rand < 0.80) {
          status = StatusDespesa.APROVADA;
          dataAprovacao = addDays(dataDespesa, randomInt(2, 15));
        } else if (rand < 0.92) {
          status = StatusDespesa.PENDENTE;
        } else {
          status = StatusDespesa.REJEITADA;
          dataAprovacao = addDays(dataDespesa, randomInt(5, 20));
        }
      } else {
        status = randomChoice([StatusDespesa.PENDENTE, StatusDespesa.APROVADA]);
      }

      let milestoneId: string | null = null;
      if (concluidos.length > 0 && Math.random() < 0.4) {
        milestoneId = randomChoice(concluidos).id;
      }

      const usuario = randomChoice([...coordenadores, ...pesquisadores, ...bolsistas]);

      despesasData.push({
        projetoId: project.id,
        rubricaId: rubrica.id,
        usuarioId: usuario.id,
        descricao,
        valor,
        dataDespesa,
        status,
        justificativa: status === StatusDespesa.REJEITADA ? randomChoice([
          'Despesa não compatível com o escopo do projeto',
          'Documentação insuficiente para aprovação',
          'Valor acima do limite permitido para a categoria',
          'Despesa duplicada identificada',
        ]) : null,
        dataAprovacao,
        milestoneId,
      });
    }

    if (despesasData.length > 0) {
      await prisma.despesa.createMany({ data: despesasData as any });

      for (const d of despesasData) {
        if (d.status === StatusDespesa.APROVADA || d.status === StatusDespesa.PAGA) {
          await prisma.rubrica.update({
            where: { id: d.rubricaId },
            data: { valorGasto: { increment: d.valor } },
          });
        }
      }

      totalDespesas += despesasData.length;
    }
  }

  console.log(`✅ ${totalDespesas} despesas criadas`);

  console.log('\n📊 Atualizando progresso físico dos projetos...');
  for (const project of projects) {
    const milestonesDoProjeto = projectMilestones.get(project.id) || [];
    const progresso = calcularProgresso(milestonesDoProjeto);

    await prisma.projeto.update({
      where: { id: project.id },
      data: { progressoFisico: progresso },
    });
  }

  console.log('✅ Progresso físico atualizado');

  console.log('\n📄 Criando documentos de exemplo...');
  let totalDocs = 0;
  const tiposDocumento = [
    { nome: 'Relatório Parcial.pdf', extensao: 'pdf' },
    { nome: 'Planilha Orçamentária.xlsx', extensao: 'xlsx' },
    { nome: 'Contrato Social.pdf', extensao: 'pdf' },
    { nome: 'Proposta Técnica.docx', extensao: 'docx' },
    { nome: 'Laudo de Ensaio.pdf', extensao: 'pdf' },
    { nome: 'Cronograma de Execução.xlsx', extensao: 'xlsx' },
  ];

  for (const project of projects) {
    if (Math.random() < 0.3) continue;

    const numDocs = randomInt(1, 4);
    const docsSelecionados = randomChoiceN(tiposDocumento, numDocs);
    const usuario = randomChoice([...coordenadores, ...pesquisadores]);

    for (const doc of docsSelecionados) {
      await prisma.documentoProjeto.create({
        data: {
          projetoId: project.id,
          usuarioId: usuario.id,
          nomeArquivo: `${project.codigo}_${doc.nome}`,
          extensao: doc.extensao,
          urlArmazenamento: `data:application/octet-stream;base64,${Buffer.from(`documento-ficticio-${project.id}-${doc.nome}`).toString('base64')}`,
        },
      });
      totalDocs++;
    }
  }

  console.log(`✅ ${totalDocs} documentos criados`);

  console.log('\n📝 Criando logs de auditoria...');
  let totalLogs = 0;

  for (const project of projects.slice(0, 20)) {
    const usuario = randomChoice([...coordenadores, ...pesquisadores]);

    await prisma.auditLog.create({
      data: {
        usuarioId: usuario.id,
        projetoId: project.id,
        entidade: 'Projeto',
        entidadeId: project.id,
        acao: 'CRIAR',
        dadosNovos: { codigo: project.codigo, titulo: project.titulo },
      },
    });
    totalLogs++;

    if (project.status === StatusProjeto.CONCLUIDO) {
      await prisma.auditLog.create({
        data: {
          usuarioId: usuario.id,
          projetoId: project.id,
          entidade: 'Projeto',
          entidadeId: project.id,
          acao: 'ATUALIZAR',
          dadosAnteriores: { status: 'ATIVO' },
          dadosNovos: { status: 'CONCLUIDO' },
        },
      });
      totalLogs++;
    }
  }

  console.log(`✅ ${totalLogs} logs de auditoria criados`);

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Resumo:`);
  console.log(`   👤 Usuários: ${users.length}`);
  console.log(`   📁 Projetos: ${projects.length}`);
  console.log(`   💰 Rubricas: ${projects.length * 6}`);
  console.log(`   👥 Equipes: ${teamData.length}`);
  console.log(`   🏁 Milestones: ${totalMilestones}`);
  console.log(`   💸 Despesas: ${totalDespesas}`);
  console.log(`   📄 Documentos: ${totalDocs}`);
  console.log(`   📝 Audit Logs: ${totalLogs}`);
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
