const API_URL = import.meta.env.DEV ? '/gas-api' : import.meta.env.VITE_API_URL

const get = async (action, params = {}) => {
  const url = new URL(API_URL, window.location.origin)
  url.searchParams.set('action', action)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const getAuthUrl = () => get('getAuthUrl')

export const getAuthStatus = () => get('getAuthStatus')

export const disconnect = () => get('disconnect')

export const exchangeCode = (code, realmId) =>
  get('exchangeCode', { code, realmId })

export const getProfitAndLoss = (startDate, endDate) =>
  get('getPnL', { start: startDate, end: endDate })
