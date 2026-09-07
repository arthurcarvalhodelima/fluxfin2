import { PrismaClient, PapelSistema, StatusProjeto, StatusDespesa } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Dados auxiliares ─────────────────────────────────────────────────────────

const PREFIXOS = [
  'Desenvolvimento de', 'Estudo de', 'Analise de', 'Implementacao de',
  'Projeto de', 'Pesquisa sobre', 'Avaliacao de', 'Monitoramento de',
  'Planejamento de', 'Otimizacao de', 'Gestao de', 'Controle de',
  'Modelagem de', 'Simulacao de', 'Sintese de', 'Identificacao de',
  'Integracao de', 'Modernizacao de', 'Diagnostico de', 'Automacao de',
];

const SUFIXOS = [
  'Sistemas de Energia Renovavel', 'Redes de Distribuicao Eletrica',
  'Eficiencia Energetica', 'Qualidade de Energia', 'Automacao Industrial',
  'Sistemas Fotovoltaicos', 'Armazenamento de Energia', 'Smart Grids',
  'Veiculos Eletricos', 'Microredes', 'Eletronica de Potencia',
  'Maquinas Eletricas', 'Eletrificacao Rural', 'Termoeletricidade',
  'Eolica Offshore', 'Hidreletricas de Pequeno Porte', 'Redes Inteligentes',
  'Gestao de Demanda', 'Subestacoes Digitais', 'Protecao de Sistemas Eletricos',
];

const DESCRICOES_PROJETO = [
  'Projeto de P&D voltado para modernizacao da infraestrutura eletrica.',
  'Pesquisa aplicada em parceria com universidades federais para o setor eletrico.',
  'Estudo tecnico para implantacao de novas tecnologias na rede de distribuicao.',
  'Desenvolvimento de sistema inteligente de monitoramento e controle de rede.',
  'Projeto de eficiencia energetica em sistemas de distribuicao.',
  'Implementacao de solucao de automacao para subestacoes de distribuicao.',
  'Estudo de viabilidade para implantacao de geracao distribuida em areas rurais.',
  'Pesquisa de sistema de armazenamento de energia para redes de distribuicao.',
  'Plataforma de gestao energetica com foco na reducao de perdas comerciais.',
  'Monitoramento em tempo real de ativos da rede usando sensores IoT.',
];

// Rubricas ANEEL com percentuais base (soma = 100%)
const RUBRICAS_ANEEL = [
  { nome: 'Recursos Humanos', categoria: 'RECURSOS_HUMANOS', percentualBase: 40 },
  { nome: 'Servicos de Terceiros', categoria: 'SERVICOS_TERCEIROS', percentualBase: 20 },
  { nome: 'Materiais de Consumo', categoria: 'MATERIAIS_CONSUMO', percentualBase: 10 },
  { nome: 'Materiais Permanentes', categoria: 'MATERIAIS_PERMANENTES', percentualBase: 15 },
  { nome: 'Viagens e Diarias', categoria: 'VIAGENS_DIARIAS', percentualBase: 5 },
  { nome: 'Custos Administrativos', categoria: 'CUSTOS_ADMINISTRATIVOS', percentualBase: 10 },
];

const MILESTONE_POOL = [
  { nome: 'Kickoff e Alinhamento Inicial', fase: 'inicio', percentual: 5 },
  { nome: 'Levantamento de Requisitos', fase: 'inicio', percentual: 10 },
  { nome: 'Diagnostico da Situacao Atual', fase: 'inicio', percentual: 8 },
  { nome: 'Estudo de Viabilidade Tecnica', fase: 'planejamento', percentual: 15 },
  { nome: 'Planejamento Detalhado do Projeto', fase: 'planejamento', percentual: 12 },
  { nome: 'Definicao da Arquitetura de Solucao', fase: 'planejamento', percentual: 10 },
  { nome: 'Aprovacao do Projeto Basico', fase: 'planejamento', percentual: 8 },
  { nome: 'Aquisicao de Materiais e Equipamentos', fase: 'execucao', percentual: 10 },
  { nome: 'Desenvolvimento do Prototipo', fase: 'execucao', percentual: 15 },
  { nome: 'Implementacao em Escala Piloto', fase: 'execucao', percentual: 12 },
  { nome: 'Integracao com Sistemas Existentes', fase: 'execucao', percentual: 10 },
  { nome: 'Testes de Aceitacao', fase: 'validacao', percentual: 8 },
  { nome: 'Treinamento da Equipe Operacional', fase: 'validacao', percentual: 5 },
  { nome: 'Relatorio Tecnico Parcial', fase: 'validacao', percentual: 7 },
  { nome: 'Validacao em Condicoes Reais', fase: 'validacao', percentual: 10 },
  { nome: 'Entrega do Relatorio Final', fase: 'encerramento', percentual: 5 },
  { nome: 'Revisao e Aprovacao pela ANEEL', fase: 'encerramento', percentual: 5 },
  { nome: 'Encerramento e Transicao', fase: 'encerramento', percentual: 3 },
];

const DESCRICOES_DESPESA: Record<string, string[]> = {
  RECURSOS_HUMANOS: [
    'Pagamento de bolsa de pesquisa',
    'Remuneracao de tecnico de laboratorio',
    'Horas extras da equipe de desenvolvimento',
    'Consultoria especializada em engenharia eletrica',
    'Estagiario de apoio ao projeto',
  ],
  SERVICOS_TERCEIROS: [
    'Servicos de analise laboratorial de materiais',
    'Contratacao de empresa de auditoria tecnica',
    'Servicos de medicao e calibracao de equipamentos',
    'Manutencao preventiva de equipamentos de campo',
  ],
  MATERIAIS_CONSUMO: [
    'Materiais eletricos para prototipo',
    'Componentes eletronicos para desenvolvimento',
    'Material de escritorio e consumiveis',
    'Insumos para testes laboratoriais',
  ],
  MATERIAIS_PERMANENTES: [
    'Aquisicao de medidor de qualidade de energia',
    'Compra de transformador de teste',
    'Aquisicao de notebook para analise de dados',
    'Compra de equipamento de medicao campometrico',
  ],
  VIAGENS_DIARIAS: [
    'Deslocamento para visita tecnica em campo',
    'Diaria para reuniao com parceiro institucional',
    'Passagem aerea para congresso tecnico',
    'Hospedagem para treinamento externo',
  ],
  CUSTOS_ADMINISTRATIVOS: [
    'Aluguel de espaco para reunioes',
    'Material de impressao e diagramacao',
    'Servicos de internet e telefonia',
    'Seguro de equipamentos em transito',
  ],
};

// ─── Utilitarios ──────────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChoiceN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
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

function generateProjectCode(index: number, year: number): string {
  return `PDI-${year}-${String(index).padStart(3, '0')}`;
}

function generateTitle(): string {
  return `${randomChoice(PREFIXOS)} ${randomChoice(SUFIXOS)}`;
}

function distribuirRubricas(orcamento: number) {
  const withVariation = RUBRICAS_ANEEL.map(r => ({
    ...r,
    percentual: r.percentualBase + randomInt(-5, 5),
  }));
  const totalPct = withVariation.reduce((s, r) => s + r.percentual, 0);
  const valores = withVariation.map(r => ({
    ...r,
    valor: Math.floor((orcamento * r.percentual) / totalPct),
  }));
  const soma = valores.reduce((s, r) => s + r.valor, 0);
  valores[0].valor += (orcamento - soma);
  return valores.map(r => ({ nome: r.nome, categoria: r.categoria, valorAlocado: r.valor }));
}

function calcularProgresso(milestones: Array<{ percentualPrevisto: number; dataExecucao: Date | null }>): number {
  const concluidos = milestones.filter(m => m.dataExecucao !== null);
  if (concluidos.length === 0) return 0;
  const total = concluidos.reduce((sum, m) => sum + Number(m.percentualPrevisto), 0);
  return Math.min(Math.round(total * 100) / 100, 100);
}

// ─── Geracao de usuarios ficticios ────────────────────────────────────────────

const N_COORDENADORES = 10;
const N_PESQUISADORES = 160;
const N_BOLSISTAS = 750;

const PRIMEIRO_NOMES = [
  'Carlos','Joao','Pedro','Lucas','Marcos','Rafael','Andre','Bruno','Felipe','Gustavo',
  'Thiago','Rodrigo','Daniel','Eduardo','Mateus','Paulo','Ricardo','Fernando','Leandro','Vitor',
  'Ana','Maria','Julia','Fernanda','Camila','Patricia','Amanda','Aline','Mariana','Beatriz',
  'Carla','Daniela','Gabriela','Helena','Isabela','Juliana','Larissa','Monica','Natalia','Paula',
];

const SOBRENOMES = [
  'Silva','Santos','Oliveira','Souza','Lima','Costa','Pereira','Carvalho',
  'Ferreira','Rodrigues','Almeida','Nascimento','Martins','Araujo','Melo',
  'Barbosa','Ribeiro','Cardoso','Rocha','Correia','Dias','Nunes','Castro',
  'Moraes','Tavares','Monteiro','Azevedo','Cunha','Borges','Campos',
  'Pinto','Andrade','Freitas','Cavalcante','Moreira',
];

function gerarNome(index: number): string {
  const nome = PRIMEIRO_NOMES[index % PRIMEIRO_NOMES.length];
  const sob1 = SOBRENOMES[index % SOBRENOMES.length];
  const sob2 = SOBRENOMES[(index + 7) % SOBRENOMES.length];
  return `${nome} ${sob1} ${sob2}`;
}

function gerarEmail(papel: string, index: number): string {
  const slug = papel.toLowerCase().slice(0, 5);
  return `${slug}${String(index).padStart(3, '0')}@fluxfin.com`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Iniciando seed completo...\n');

  // 1. Limpar banco
  console.log('Limpando banco de dados...');
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_check_coordenador ON "EquipeProjeto"').catch(() => {});
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_prevent_auditlog_modification ON "AuditLog"').catch(() => {});
  await prisma.auditLog.deleteMany();
  await prisma.documentoProjeto.deleteMany();
  await prisma.despesa.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.equipeProjeto.deleteMany();
  await prisma.rubrica.deleteMany();
  await prisma.projeto.deleteMany();
  await prisma.usuario.deleteMany();
  console.log('Banco limpo\n');

  // 2. Criar usuarios
  console.log('Criando usuarios...');
  const senhaHashed = await bcrypt.hash('senha123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.create({
    data: { nome: 'Administrador', email: 'admin@fluxfin.com', senha: adminHash, papelSistema: PapelSistema.ADMIN },
  });

  const coordenadores: typeof admin[] = [];
  for (let i = 1; i <= N_COORDENADORES; i++) {
    const u = await prisma.usuario.create({
      data: { nome: gerarNome(i), email: gerarEmail('coord', i), senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
    });
    coordenadores.push(u);
  }
  console.log(`  ${coordenadores.length} coordenadores criados`);

  const pesquisadores: typeof admin[] = [];
  for (let i = 1; i <= N_PESQUISADORES; i++) {
    const u = await prisma.usuario.create({
      data: { nome: gerarNome(i + 100), email: gerarEmail('pesq', i), senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
    });
    pesquisadores.push(u);
    if (i % 50 === 0) console.log(`  ${i}/${N_PESQUISADORES} pesquisadores criados`);
  }

  console.log('  Criando bolsistas (pode demorar)...');
  const bolsistas: typeof admin[] = [];
  for (let i = 1; i <= N_BOLSISTAS; i++) {
    const u = await prisma.usuario.create({
      data: { nome: gerarNome(i + 300), email: gerarEmail('bols', i), senha: senhaHashed, papelSistema: PapelSistema.USUARIO },
    });
    bolsistas.push(u);
    if (i % 150 === 0) console.log(`  ${i}/${N_BOLSISTAS} bolsistas criados`);
  }

  const totalUsuarios = 1 + coordenadores.length + pesquisadores.length + bolsistas.length;
  console.log(`Usuarios criados: ${totalUsuarios}\n`);

  // 3. Controle de lotacao
  const projPorCoord = new Map<string, number>(coordenadores.map(c => [c.id, 0]));
  const projPorPesq = new Map<string, number>(pesquisadores.map(p => [p.id, 0]));
  const projPorBols = new Map<string, number>(bolsistas.map(b => [b.id, 0]));
  let coordCursor = 0, pesqCursor = 0, bolsCursor = 0;

  function proximoCoord(): typeof admin {
    for (let t = 0; t < coordenadores.length; t++) {
      const c = coordenadores[coordCursor % coordenadores.length];
      coordCursor++;
      if ((projPorCoord.get(c.id) ?? 0) < 10) {
        projPorCoord.set(c.id, (projPorCoord.get(c.id) ?? 0) + 1);
        return c;
      }
    }
    throw new Error('Nenhum coordenador disponivel!');
  }

  function proximosPesq(n: number): typeof admin[] {
    const sel: typeof admin[] = [];
    let t = 0;
    while (sel.length < n && t < pesquisadores.length * 2) {
      const p = pesquisadores[pesqCursor % pesquisadores.length];
      pesqCursor++; t++;
      if ((projPorPesq.get(p.id) ?? 0) < 5) {
        projPorPesq.set(p.id, (projPorPesq.get(p.id) ?? 0) + 1);
        sel.push(p);
      }
    }
    return sel;
  }

  function proximosBols(n: number): typeof admin[] {
    const sel: typeof admin[] = [];
    let t = 0;
    while (sel.length < n && t < bolsistas.length) {
      const b = bolsistas[bolsCursor % bolsistas.length];
      bolsCursor++; t++;
      if ((projPorBols.get(b.id) ?? 0) < 1) {
        projPorBols.set(b.id, 1);
        sel.push(b);
      }
    }
    return sel;
  }

  // 4. Criar 100 projetos
  console.log('Criando 100 projetos...');
  const agora = new Date();
  const duracoes = [12, 24, 36, 48];
  const statusPool: StatusProjeto[] = [StatusProjeto.ATIVO, StatusProjeto.CONCLUIDO, StatusProjeto.SUSPENSO];
  const projects: Array<{
    id: string; codigo: string; titulo: string;
    budget: number; duration: number;
    startDate: Date; endDate: Date; status: StatusProjeto;
  }> = [];
  const usedCodes = new Set<string>();

  for (let i = 1; i <= 100; i++) {
    const year = randomInt(2022, 2026);
    const month = randomInt(1, 12);
    const duration = randomChoice(duracoes);
    const startDate = new Date(year, month - 1, 1); // dia 1 fixo
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

    let code = generateProjectCode(i, year);
    let suffix = 0;
    while (usedCodes.has(code)) { suffix++; code = `PDI-${year}-${String(i).padStart(3, '0')}-${suffix}`; }
    usedCodes.add(code);

    const project = await prisma.projeto.create({
      data: { codigo: code, titulo: generateTitle(), descricao: randomChoice(DESCRICOES_PROJETO), dataInicio: startDate, dataTermino: endDate, orcamentoGlobal: budget, status, progressoFisico: 0 },
    });
    projects.push({ ...project, budget, duration, startDate, endDate, status });
    if (i % 25 === 0) console.log(`  ${i}/100 projetos criados`);
  }
  console.log('100 projetos criados\n');

  // 5. Rubricas ANEEL
  console.log('Distribuindo orcamento nas rubricas ANEEL...');
  for (const p of projects) {
    const rubricas = distribuirRubricas(p.budget);
    await prisma.rubrica.createMany({ data: rubricas.map(r => ({ projetoId: p.id, nome: r.nome, categoria: r.categoria, valorAlocado: r.valorAlocado })) });
  }
  console.log('Rubricas criadas (6 por projeto)\n');

  // 6. Equipes
  console.log('Montando equipes (respeitando limites de lotacao)...');
  let totalEquipe = 0;
  for (const project of projects) {
    const coord = proximoCoord();
    const pesqSel = proximosPesq(randomInt(5, 10));
    const bolsSel = proximosBols(randomInt(5, 10));
    const membros = [
      { usuarioId: coord.id, papel: 'COORDENADOR' as const },
      ...pesqSel.map(u => ({ usuarioId: u.id, papel: 'PESQUISADOR' as const })),
      ...bolsSel.map(u => ({ usuarioId: u.id, papel: 'BOLSISTA' as const })),
    ];
    for (const m of membros) {
      await prisma.equipeProjeto.create({ data: { projetoId: project.id, usuarioId: m.usuarioId, papel: m.papel } });
    }
    totalEquipe += membros.length;
  }
  console.log(`${totalEquipe} vinculos de equipe criados\n`);

  // 7. Milestones
  console.log('Criando milestones...');
  let totalMilestones = 0;
  const projectMilestones = new Map<string, Array<{ id: string; percentualPrevisto: number; dataExecucao: Date | null }>>();
  for (const project of projects) {
    const numMs = randomInt(3, 7);
    const selected = randomChoiceN(MILESTONE_POOL, numMs).sort((a, b) => {
      const order = { inicio: 0, planejamento: 1, execucao: 2, validacao: 3, encerramento: 4 };
      return order[a.fase as keyof typeof order] - order[b.fase as keyof typeof order];
    });
    const durationDays = Math.ceil((project.endDate.getTime() - project.startDate.getTime()) / 86400000);
    const msData: Array<{ id: string; percentualPrevisto: number; dataExecucao: Date | null }> = [];
    for (let m = 0; m < selected.length; m++) {
      const ms = selected[m];
      const fraction = (m + 1) / selected.length;
      const daysFromStart = Math.max(30, Math.min(Math.round(durationDays * fraction) + randomInt(-15, 15), durationDays - 5));
      const milestoneDate = addDays(project.startDate, daysFromStart);
      let dataExecucao: Date | null = null;
      if (project.status === StatusProjeto.CONCLUIDO) {
        dataExecucao = addDays(milestoneDate, randomInt(-10, 5));
      } else if (project.status === StatusProjeto.ATIVO && milestoneDate < agora) {
        if (Math.random() < 0.75) dataExecucao = addDays(milestoneDate, randomInt(-5, 15));
      }
      const created = await prisma.milestone.create({
        data: { projetoId: project.id, nome: ms.nome, descricao: `${ms.nome} - ${project.codigo}`, dataPrevista: milestoneDate, dataExecucao, percentualPrevisto: ms.percentual },
      });
      msData.push({ id: created.id, percentualPrevisto: ms.percentual, dataExecucao });
      totalMilestones++;
    }
    projectMilestones.set(project.id, msData);
  }
  console.log(`${totalMilestones} milestones criados\n`);

  // 8. Despesas
  console.log('Criando despesas...');
  let totalDespesas = 0;
  const allUsers = [...coordenadores, ...pesquisadores.slice(0, 30)];
  for (const project of projects) {
    if (project.status === StatusProjeto.SUSPENSO && Math.random() < 0.5) continue;
    const rubricas = await prisma.rubrica.findMany({ where: { projetoId: project.id } });
    const msConcluidos = (projectMilestones.get(project.id) ?? []).filter(m => m.dataExecucao !== null);
    const numDespesas = randomInt(5, 15);
    const despesasData: any[] = [];
    for (let d = 0; d < numDespesas; d++) {
      const rubrica = randomChoice(rubricas);
      const descricoes = DESCRICOES_DESPESA[rubrica.categoria] ?? DESCRICOES_DESPESA['CUSTOS_ADMINISTRATIVOS'];
      const saldo = Number(rubrica.valorAlocado) - Number(rubrica.valorGasto);
      const maxValor = Math.min(saldo * 0.4, Number(rubrica.valorAlocado) * 0.15);
      if (maxValor < 1000) continue;
      const valor = randomInt(1000, Math.max(1001, Math.round(maxValor)));
      const durationDays = Math.ceil((project.endDate.getTime() - project.startDate.getTime()) / 86400000);
      const dataDespesa = addDays(project.startDate, randomInt(0, durationDays));
      let status: StatusDespesa, dataAprovacao: Date | null = null;
      if (dataDespesa > agora) {
        status = StatusDespesa.PENDENTE;
      } else {
        const r = Math.random();
        if (r < 0.55) { status = StatusDespesa.PAGA; dataAprovacao = addDays(dataDespesa, randomInt(3, 30)); }
        else if (r < 0.80) { status = StatusDespesa.APROVADA; dataAprovacao = addDays(dataDespesa, randomInt(2, 15)); }
        else if (r < 0.92) { status = StatusDespesa.PENDENTE; }
        else { status = StatusDespesa.REJEITADA; dataAprovacao = addDays(dataDespesa, randomInt(5, 20)); }
      }
      despesasData.push({
        projetoId: project.id,
        rubricaId: rubrica.id,
        usuarioId: randomChoice(allUsers).id,
        descricao: randomChoice(descricoes),
        valor, dataDespesa, status,
        justificativa: status === StatusDespesa.REJEITADA ? 'Despesa nao compativel com o escopo do projeto' : null,
        dataAprovacao,
        milestoneId: msConcluidos.length > 0 && Math.random() < 0.4 ? randomChoice(msConcluidos).id : null,
      });
    }
    if (despesasData.length > 0) {
      await prisma.despesa.createMany({ data: despesasData });
      for (const d of despesasData) {
        if (d.status === StatusDespesa.APROVADA || d.status === StatusDespesa.PAGA) {
          await prisma.rubrica.update({ where: { id: d.rubricaId }, data: { valorGasto: { increment: d.valor } } });
        }
      }
      totalDespesas += despesasData.length;
    }
  }
  console.log(`${totalDespesas} despesas criadas\n`);

  // 9. Progresso fisico
  console.log('Atualizando progresso fisico...');
  for (const project of projects) {
    const ms = projectMilestones.get(project.id) ?? [];
    await prisma.projeto.update({ where: { id: project.id }, data: { progressoFisico: calcularProgresso(ms) } });
  }
  console.log('Progresso fisico atualizado\n');

  // 10. Recriar triggers
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_check_coordenador
      AFTER INSERT OR DELETE ON "EquipeProjeto"
      FOR EACH ROW EXECUTE FUNCTION check_coordenador_exists()
  `).catch(() => console.log('Trigger trg_check_coordenador nao recriado'));

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_prevent_auditlog_modification
      BEFORE UPDATE OR DELETE ON "AuditLog"
      FOR EACH ROW EXECUTE FUNCTION prevent_auditlog_modification()
  `).catch(() => console.log('Trigger trg_prevent_auditlog_modification nao recriado'));

  // Resumo
  console.log('\n========================================');
  console.log('SEED CONCLUIDO COM SUCESSO!');
  console.log('========================================');
  console.log(`Total de usuarios  : ${totalUsuarios}`);
  console.log(`  Admin            : 1`);
  console.log(`  Coordenadores    : ${coordenadores.length} (max 10 projetos cada)`);
  console.log(`  Pesquisadores    : ${pesquisadores.length} (max 5 projetos cada)`);
  console.log(`  Bolsistas        : ${bolsistas.length} (max 1 projeto cada)`);
  console.log(`Projetos           : ${projects.length}`);
  console.log(`Rubricas ANEEL     : ${projects.length * 6} (6 por projeto)`);
  console.log(`Vinculos de equipe : ${totalEquipe}`);
  console.log(`Milestones         : ${totalMilestones}`);
  console.log(`Despesas           : ${totalDespesas}`);
  console.log('========================================');
  console.log('Acesso admin: admin@fluxfin.com / admin123');
  console.log('Acesso coord: coord001@fluxfin.com / senha123');
  console.log('========================================');
}

main()
  .catch((e) => { console.error('Erro no seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
