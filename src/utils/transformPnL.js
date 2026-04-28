// Transforms the QB ProfitAndLoss API response into chart-ready data.
// QB returns rows keyed by section name; we extract the four metrics we care about.

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function findRowValue(rows, label) {
  if (!rows) return null
  for (const row of rows) {
    if (row.type === 'Section' && row.group === label) {
      const summary = row.rows?.find((r) => r.type === 'Summary')
      return summary?.colData?.[1]?.value ?? null
    }
    if (row.header?.ColData?.[0]?.value === label) {
      return row.summary?.ColData?.[1]?.value ?? null
    }
  }
  return null
}

export function transformPnL(raw) {
  // raw.Columns gives the period headers; raw.Rows gives section data
  const columns = raw?.Columns?.Column ?? []
  const rows = raw?.Rows?.Row ?? []

  // Column 0 is the row label; columns 1..N are periods
  const periods = columns.slice(1).map((c) => c.MetaData?.find((m) => m.Name === 'StartDate')?.Value ?? c.value)

  const extract = (sectionGroup) => {
    for (const row of rows) {
      if (row.type === 'Section' && row.group === sectionGroup) {
        return row.Summary?.ColData?.slice(1).map((d) => parseFloat(d.value) || 0) ?? []
      }
    }
    return periods.map(() => 0)
  }

  const revenue = extract('Income')
  const cogs = extract('COGS')
  const expenses = extract('Expenses')
  const netIncome = extract('NetIncome')

  return periods.map((p, i) => {
    const date = new Date(p)
    const label = isNaN(date) ? p : `${MONTH_ABBR[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`
    const rev = revenue[i] ?? 0
    const cg = cogs[i] ?? 0
    const opex = expenses[i] ?? 0
    const net = netIncome[i] ?? 0
    const grossMargin = rev !== 0 ? ((rev - cg) / rev) * 100 : 0
    const netMargin = rev !== 0 ? (net / rev) * 100 : 0
    return {
      period: label,
      Revenue: rev,
      COGS: cg,
      'Op Expenses': opex,
      'Net Income': net,
      'Gross Margin': grossMargin,
      'Net Margin': netMargin,
    }
  })
}

export function aggregateToQuarterly(monthly) {
  const quarters = {}
  monthly.forEach((row) => {
    // period is like "Jan 23" — parse back to a quarter key
    const [mon, yr] = row.period.split(' ')
    const monthIdx = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(mon)
    if (monthIdx === -1) return
    const q = Math.floor(monthIdx / 3) + 1
    const key = `Q${q} ${yr}`
    if (!quarters[key]) {
      quarters[key] = { period: key, Revenue: 0, COGS: 0, 'Op Expenses': 0, 'Net Income': 0 }
    }
    quarters[key].Revenue += row.Revenue
    quarters[key].COGS += row.COGS
    quarters[key]['Op Expenses'] += row['Op Expenses']
    quarters[key]['Net Income'] += row['Net Income']
  })
  return Object.values(quarters).map((q) => ({
    ...q,
    'Gross Margin': q.Revenue !== 0 ? ((q.Revenue - q.COGS) / q.Revenue) * 100 : 0,
    'Net Margin': q.Revenue !== 0 ? (q['Net Income'] / q.Revenue) * 100 : 0,
  }))
}

export function calcKPIs(data, prevData) {
  const sum = (key) => data.reduce((acc, r) => acc + (r[key] ?? 0), 0)
  const prevSum = (key) => prevData?.reduce((acc, r) => acc + (r[key] ?? 0), 0) ?? null
  const yoy = (curr, prev) => prev && prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : null

  const revenue = sum('Revenue')
  const cogs = sum('COGS')
  const opex = sum('Op Expenses')
  const net = sum('Net Income')

  const pRev = prevSum('Revenue')
  const pCogs = prevSum('COGS')
  const pOpex = prevSum('Op Expenses')
  const pNet = prevSum('Net Income')

  return {
    revenue: { value: revenue, change: yoy(revenue, pRev) },
    cogs: { value: cogs, change: yoy(cogs, pCogs) },
    opex: { value: opex, change: yoy(opex, pOpex) },
    net: { value: net, change: yoy(net, pNet) },
  }
}
