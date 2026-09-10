/**
 * Cálculos das metas financeiras.
 *
 * Tudo em centavos (inteiro). Dinheiro em ponto flutuante acumula erro a cada
 * operação, e aqui os valores são somados repetidamente ao longo de meses.
 *
 * Nada aqui envolve rendimento, juros ou investimento — é divisão simples de
 * quanto falta pelo tempo que resta.
 */

const CENTAVOS_POR_REAL = 100
/** Duração média do mês em dias, para converter prazos em parcelas. */
const DIAS_POR_MES = 30.44

export function formatarBRL(centavos: number): string {
  return (centavos / CENTAVOS_POR_REAL).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/** Versão curta para caber em cartão: R$ 1,2 mil / R$ 10 mil. */
export function formatarBRLCurto(centavos: number): string {
  const reais = centavos / CENTAVOS_POR_REAL
  if (Math.abs(reais) >= 1000) {
    const milhares = reais / 1000
    const casas = Math.abs(milhares) >= 100 ? 0 : 1
    return `R$ ${milhares.toFixed(casas).replace('.', ',')} mil`
  }
  return formatarBRL(centavos)
}

/**
 * Lê o que a pessoa digitou e devolve centavos.
 *
 * Aceita os formatos que aparecem na prática: "10000", "10.000", "10.000,50",
 * "R$ 10000,50" e também "10000.50" (quem digita no padrão do teclado numérico).
 * Devolve null quando não dá para entender — o chamador decide o que fazer.
 */
export function lerValorEmCentavos(entrada: string): number | null {
  const limpo = entrada.replace(/[^\d.,-]/g, '').trim()
  if (!limpo) return null

  const temVirgula = limpo.includes(',')
  const temPonto = limpo.includes('.')

  let normalizado: string
  if (temVirgula && temPonto) {
    // "10.000,50" — ponto é separador de milhar, vírgula é decimal.
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    normalizado = limpo.replace(',', '.')
  } else if (temPonto) {
    // Ambíguo: "10.000" é dez mil, "10.50" é dez e cinquenta. Duas casas
    // depois do último ponto indicam decimal; qualquer outra coisa, milhar.
    const depois = limpo.split('.').pop() ?? ''
    normalizado = depois.length === 2 ? limpo : limpo.replace(/\./g, '')
  } else {
    normalizado = limpo
  }

  const valor = Number(normalizado)
  if (!Number.isFinite(valor)) return null

  return Math.round(valor * CENTAVOS_POR_REAL)
}

function diasEntre(de: Date, ate: Date): number {
  const inicio = new Date(de.getFullYear(), de.getMonth(), de.getDate())
  const fim = new Date(ate.getFullYear(), ate.getMonth(), ate.getDate())
  return Math.round((fim.getTime() - inicio.getTime()) / 86_400_000)
}

export interface PlanoDaMeta {
  alvoCents: number
  guardadoCents: number
  faltaCents: number
  /** 0 a 1. Passa de 1 quando guardaram mais que a meta. */
  progresso: number
  concluida: boolean

  /** null quando a meta não tem data definida. */
  diasRestantes: number | null
  mesesRestantes: number | null
  atrasada: boolean

  /** Quanto guardar por período para chegar na data. null sem data. */
  porMesCents: number | null
  porSemanaCents: number | null
  porDiaCents: number | null

  /** Média mensal efetiva até agora, com base no primeiro aporte. */
  ritmoMensalCents: number | null
  /** Meses para concluir mantendo o ritmo atual. null se ainda não há ritmo. */
  mesesNoRitmoAtual: number | null
}

export function planejarMeta(input: {
  alvoCents: number
  guardadoCents: number
  dataAlvo?: string | null
  primeiroAporte?: string | null
  hoje?: Date
}): PlanoDaMeta {
  const hoje = input.hoje ?? new Date()
  const faltaCents = Math.max(0, input.alvoCents - input.guardadoCents)
  const concluida = input.guardadoCents >= input.alvoCents

  const progresso = input.alvoCents > 0 ? input.guardadoCents / input.alvoCents : 0

  let diasRestantes: number | null = null
  let mesesRestantes: number | null = null
  let porMesCents: number | null = null
  let porSemanaCents: number | null = null
  let porDiaCents: number | null = null
  let atrasada = false

  if (input.dataAlvo) {
    diasRestantes = diasEntre(hoje, new Date(`${input.dataAlvo}T12:00:00`))
    atrasada = diasRestantes < 0 && !concluida

    if (diasRestantes > 0 && !concluida) {
      // Pelo menos uma parcela: prazo de 10 dias ainda é "um depósito".
      mesesRestantes = Math.max(1, Math.round(diasRestantes / DIAS_POR_MES))
      // Arredonda para cima: guardar o valor exato deixaria centavos faltando.
      porMesCents = Math.ceil(faltaCents / mesesRestantes)
      porSemanaCents = Math.ceil(faltaCents / Math.max(1, diasRestantes / 7))
      porDiaCents = Math.ceil(faltaCents / diasRestantes)
    } else if (!concluida) {
      mesesRestantes = 0
    }
  }

  // Ritmo efetivo: só faz sentido depois que existe um primeiro aporte.
  let ritmoMensalCents: number | null = null
  let mesesNoRitmoAtual: number | null = null

  if (input.primeiroAporte && input.guardadoCents > 0) {
    const diasGuardando = Math.max(1, diasEntre(new Date(`${input.primeiroAporte}T12:00:00`), hoje))
    const mesesGuardando = Math.max(1, diasGuardando / DIAS_POR_MES)
    ritmoMensalCents = Math.round(input.guardadoCents / mesesGuardando)

    if (ritmoMensalCents > 0 && !concluida) {
      mesesNoRitmoAtual = Math.ceil(faltaCents / ritmoMensalCents)
    }
  }

  return {
    alvoCents: input.alvoCents,
    guardadoCents: input.guardadoCents,
    faltaCents,
    progresso,
    concluida,
    diasRestantes,
    mesesRestantes,
    atrasada,
    porMesCents,
    porSemanaCents,
    porDiaCents,
    ritmoMensalCents,
    mesesNoRitmoAtual,
  }
}

/** Caminho inverso: com X por mês, em quantos meses a meta fecha? */
export function mesesParaAlcancar(faltaCents: number, porMesCents: number): number | null {
  if (porMesCents <= 0) return null
  return Math.ceil(faltaCents / porMesCents)
}

/** Data aproximada de conclusão guardando um valor fixo por mês. */
export function dataEstimada(faltaCents: number, porMesCents: number, hoje = new Date()): Date | null {
  const meses = mesesParaAlcancar(faltaCents, porMesCents)
  if (meses === null) return null
  const data = new Date(hoje)
  data.setMonth(data.getMonth() + meses)
  return data
}

/**
 * Ideias de economia doméstica para o simulador.
 *
 * São pontos de partida editáveis, não recomendação: cada casal ajusta o valor
 * para a própria realidade. Os números iniciais são conservadores de propósito.
 */
export interface IdeiaDeEconomia {
  id: string
  titulo: string
  detalhe: string
  emoji: string
  sugestaoCents: number
}

export const IDEIAS_DE_ECONOMIA: IdeiaDeEconomia[] = [
  {
    id: 'delivery',
    titulo: 'Trocar dois deliverys por jantar em casa',
    detalhe: 'Cozinhar junto vira encontro e o valor da meta cresce sozinho.',
    emoji: '🍝',
    sugestaoCents: 12_000,
  },
  {
    id: 'assinaturas',
    titulo: 'Cancelar assinaturas que ninguém usa',
    detalhe: 'Vale abrir a fatura e conferir uma por uma — costuma aparecer coisa esquecida.',
    emoji: '📺',
    sugestaoCents: 5_000,
  },
  {
    id: 'cafe',
    titulo: 'Café da rua só nos fins de semana',
    detalhe: 'Fazer em casa nos dias de semana rende mais do que parece no mês.',
    emoji: '☕',
    sugestaoCents: 8_000,
  },
  {
    id: 'mercado',
    titulo: 'Lista de mercado combinada antes de ir',
    detalhe: 'Comprar com lista e sem fome corta boa parte do que não estava no plano.',
    emoji: '🛒',
    sugestaoCents: 15_000,
  },
  {
    id: 'transporte',
    titulo: 'Combinar caronas e menos apps de transporte',
    detalhe: 'Ir junto quando o horário bate reduz duas corridas para uma.',
    emoji: '🚗',
    sugestaoCents: 10_000,
  },
  {
    id: 'metadeimprevisto',
    titulo: 'Metade de todo dinheiro inesperado',
    detalhe: 'Décimo terceiro, reembolso, venda de algo parado — metade vai para a meta.',
    emoji: '🎁',
    sugestaoCents: 0,
  },
  {
    id: 'troco',
    titulo: 'Arredondar e guardar a diferença',
    detalhe: 'Toda compra sobe para o real cheio e a diferença entra no cofre.',
    emoji: '🪙',
    sugestaoCents: 3_000,
  },
  {
    id: 'saidas',
    titulo: 'Um programa gratuito por semana',
    detalhe: 'Parque, praia, trilha, cinema em casa — encontro que não custa.',
    emoji: '🌳',
    sugestaoCents: 9_000,
  },
]
