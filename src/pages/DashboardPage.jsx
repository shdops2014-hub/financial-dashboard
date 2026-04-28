import { useState, useEffect, useCallback } from 'react'
import KPICard from '../components/KPICard'
import TrendChart from '../components/TrendChart'
import MarginChart from '../components/MarginChart'
import PeriodSelector from '../components/PeriodSelector'
import ConnectButton from '../components/ConnectButton'
import { getAuthStatus, getProfitAndLoss } from '../api/quickbooksApi'
import { transformPnL, aggregateToQuarterly, calcKPIs } from '../utils/transformPnL'

const CURRENT_YEAR = new Date().getFullYear()
const ALL_YEARS = Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => 2023 + i)

export default function DashboardPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [allMonthly, setAllMonthly] = useState([])
  const [granularity, setGranularity] = useState('Monthly')
  const [startYear, setStartYear] = useState(2023)
  const [endYear, setEndYear] = useState(CURRENT_YEAR)

  const checkAuth = useCallback(async () => {
    try {
      const { connected: c } = await getAuthStatus()
      setConnected(c)
      return c
    } catch {
      return false
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await getProfitAndLoss(`${2023}-01-01`, `${CURRENT_YEAR}-12-31`)
      setAllMonthly(transformPnL(raw))
    } catch (e) {
      setError('Failed to load financial data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth().then((c) => {
      if (c) loadData()
      else setLoading(false)
    })
  }, [checkAuth, loadData])

  // Filter monthly data to selected year range
  const filtered = allMonthly.filter((row) => {
    const yr = 2000 + parseInt(row.period.split(' ')[1] ?? '0', 10)
    return yr >= startYear && yr <= endYear
  })

  const chartData = granularity === 'Quarterly' ? aggregateToQuarterly(filtered) : filtered

  // KPIs: compare selected range vs same range in the prior year
  const priorFiltered = allMonthly.filter((row) => {
    const yr = 2000 + parseInt(row.period.split(' ')[1] ?? '0', 10)
    return yr >= startYear - 1 && yr <= endYear - 1
  })
  const kpis = calcKPIs(filtered, priorFiltered.length ? priorFiltered : null)

  return (
    <div className="min-h-screen bg-shd-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-shd-brown rounded-lg flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <div>
            <h1 className="font-bold text-shd-dark text-lg leading-none">Financial Dashboard</h1>
            <p className="text-xs text-gray-400">Sarah's Home Design, LLC</p>
          </div>
        </div>
        <ConnectButton connected={connected} onConnect={() => { setConnected(true); loadData() }} onDisconnect={() => { setConnected(false); setAllMonthly([]) }} />
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {!connected ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 bg-white rounded-full shadow flex items-center justify-center text-3xl">📊</div>
            <h2 className="text-xl font-bold text-shd-dark">Connect QuickBooks to get started</h2>
            <p className="text-gray-500 max-w-sm text-sm">
              Link your QuickBooks account to pull live P&amp;L data and visualize revenue, COGS, expenses, and net income trends from 2023 to today.
            </p>
            <ConnectButton connected={false} onConnect={() => { setConnected(true); loadData() }} onDisconnect={() => {}} />
          </div>
        ) : (
          <>
            {/* Period selector */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Profit & Loss Overview</h2>
              <PeriodSelector
                granularity={granularity}
                onGranularity={setGranularity}
                startYear={startYear}
                onStartYear={setStartYear}
                endYear={endYear}
                onEndYear={setEndYear}
                years={ALL_YEARS}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">{error}</div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse h-24" />
                ))}
              </div>
            ) : (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard label="Revenue" value={kpis.revenue.value} change={kpis.revenue.change} />
                  <KPICard label="Cost of Goods Sold" value={kpis.cogs.value} change={kpis.cogs.change} positive={false} />
                  <KPICard label="Operating Expenses" value={kpis.opex.value} change={kpis.opex.change} positive={false} />
                  <KPICard label="Net Income" value={kpis.net.value} change={kpis.net.change} />
                </div>

                {/* Main trend chart */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <p className="text-sm font-semibold text-shd-dark mb-4">Revenue vs. Expenses</p>
                  <TrendChart data={chartData} />
                </div>

                {/* Margin charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MarginChart
                    data={chartData}
                    dataKey="Gross Margin"
                    color="#8B6F47"
                    label="Gross Margin %"
                  />
                  <MarginChart
                    data={chartData}
                    dataKey="Net Margin"
                    color="#2C2C2C"
                    label="Net Margin %"
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
