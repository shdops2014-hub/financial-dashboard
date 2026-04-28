export default function KPICard({ label, value, change, prefix = '$', positive }) {
  const isPositive = change >= 0
  const changeColor = positive === false
    ? (isPositive ? 'text-red-500' : 'text-green-600')
    : (isPositive ? 'text-green-600' : 'text-red-500')

  const formatted = value == null
    ? '—'
    : prefix + Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-shd-dark">{formatted}</p>
      {change != null && (
        <p className={`mt-1 text-xs font-medium ${changeColor}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% vs prior year
        </p>
      )}
    </div>
  )
}
