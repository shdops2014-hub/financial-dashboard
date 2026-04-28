import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const fmt = (v) => '$' + (v / 1000).toFixed(0) + 'k'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-md text-xs">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium">
            ${Math.abs(entry.value).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
        <Bar dataKey="Revenue" fill="#8B6F47" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="COGS" fill="#C4A882" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="Op Expenses" fill="#D4C5B0" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Line
          type="monotone"
          dataKey="Net Income"
          stroke="#2C2C2C"
          strokeWidth={2}
          dot={{ r: 3, fill: '#2C2C2C' }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
