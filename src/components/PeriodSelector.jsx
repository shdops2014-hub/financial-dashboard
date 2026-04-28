const GRANULARITIES = ['Monthly', 'Quarterly']

export default function PeriodSelector({ granularity, onGranularity, startYear, onStartYear, endYear, onEndYear, years }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        {GRANULARITIES.map((g) => (
          <button
            key={g}
            onClick={() => onGranularity(g)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              granularity === g
                ? 'bg-shd-brown text-white'
                : 'bg-white text-gray-600 hover:bg-shd-cream'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <label className="font-medium">From</label>
        <select
          value={startYear}
          onChange={(e) => onStartYear(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <label className="font-medium">To</label>
        <select
          value={endYear}
          onChange={(e) => onEndYear(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  )
}
