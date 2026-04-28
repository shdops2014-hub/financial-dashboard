import { useState, useEffect } from 'react'
import { getAuthUrl, disconnect } from '../api/quickbooksApi'

export default function ConnectButton({ connected, onConnect, onDisconnect }) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      if (e.data === 'qb-connected') onConnect()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onConnect])

  const handleConnect = async () => {
    setLoading(true)
    try {
      const { url } = await getAuthUrl()
      const popup = window.open(url, 'qb-auth', 'width=600,height=700,left=200,top=100')
      const timer = setInterval(() => {
        if (popup?.closed) { clearInterval(timer); setLoading(false) }
      }, 500)
    } catch {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setLoading(true)
    try {
      await disconnect()
      onDisconnect()
    } finally {
      setLoading(false)
    }
  }

  if (connected) {
    return (
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
      >
        Disconnect QuickBooks
      </button>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="flex items-center gap-2 bg-[#2CA01C] hover:bg-[#248F18] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
    >
      <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="white" fillOpacity="0.2" />
        <path d="M8 16a8 8 0 1 1 16 0A8 8 0 0 1 8 16z" fill="white" />
      </svg>
      {loading ? 'Connecting…' : 'Connect QuickBooks'}
    </button>
  )
}
