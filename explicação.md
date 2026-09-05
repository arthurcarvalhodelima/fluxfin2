# Dashboard - Explicação dos Valores

## Valores Simples

| Card | Fórmula | Fonte dos dados |
|---|---|---|
| **Total Projetos** | `COUNT(projetos)` | Todos os projetos não deletados |
| **Orcamento Global** | `SUM(orcamentoProjeto)` | Soma do orçamento de todos os projetos |
| **Total Gasto** | `SUM(valor)` | Soma de despesas com status `APROVADA` ou `PAGA` |

---

## Índices EVM (Earned Value Management)

Esses valores usam 3 variáveis base calculadas a partir dos **projetos ATIVOS**:

| Variável | O que é | Fórmula |
|---|---|---|
| **BAC** | Orçamento total de todos os projetos | `SUM(orcamentoProjeto)` |
| **PV** (Planned Value) | Quanto deveria ter sido gasto até hoje | `SUM((tempoDecorrido / duracaoTotal) × orcamentoProjeto)` por projeto ativo |
| **EV** (Earned Value) | Quanto valor foi efetivamente entregue | `SUM((progressoFisico / 100) × orcamentoProjeto)` por projeto ativo |
| **AC** (Actual Cost) | Quanto realmente foi gasto | Soma de despesas de projetos **ativos** apenas |

---

## Métricas Derivadas

| Card | Fórmula | Significado |
|---|---|---|
| **CPI** | `EV / AC` | Eficiência de custo. Se CPI < 1, está gastando mais que o previsto |
| **SPI** | `EV / PV` | Eficiência de cronograma. Se SPI < 1, está atrasado |
| **EAC** | `BAC / CPI` (se CPI=0 → retorna BAC) | Estimativa do custo total ao final do projeto |
| **ETC** | `(BAC - EV) / CPI` (se CPI=0 → retorna BAC-EV) | Quanto falta para gastar |
| **VAC** | `BAC - EAC` | Variância prevista (quanto vai sobrar/faltar) |
| **TCPI** | `(BAC - EV) / (BAC - AC)` | Eficiência necessária para terminar no orçamento |

---

## Como os índices são afetados

- **CPI e SPI zerados**: Quando `progressoFisico = 0` em todos os projetos, o EV = 0, resultando em CPI = 0 e SPI = 0.
- **Para os índices subirem**: É necessário **concluir milestones** nos projetos, o que atualiza `progressoFisico` automaticamente.
