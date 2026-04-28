// ── Configuration ─────────────────────────────────────────────────────────────
// Store these in Project Settings → Script Properties (never hardcode):
//   QUICKBOOKS_CLIENT_ID
//   QUICKBOOKS_CLIENT_SECRET
//   FRONTEND_URL  (e.g. https://your-github-pages-domain/shd-finance/)

const QB_BASE = 'https://appcenter.intuit.com/connect/oauth2'
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
const QB_REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke'
const QB_API_BASE = 'https://quickbooks.api.intuit.com'
const SCOPES = 'com.intuit.quickbooks.accounting'

function getProps() {
  return PropertiesService.getScriptProperties()
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

function addCors(output) {
  // GAS web apps don't support custom response headers directly,
  // but returning JSON with status 200 is sufficient for same-origin or
  // apps deployed behind a proxy. For local dev, use a browser extension.
  return output
}

// ── Entry point ───────────────────────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action

  // OAuth callback from Intuit (no action param)
  if (!action) return handleOAuthCallback(e)

  if (action === 'getAuthUrl') return addCors(json({ url: buildAuthUrl() }))
  if (action === 'getAuthStatus') return addCors(json({ connected: isConnected() }))
  if (action === 'exchangeCode') return addCors(handleExchangeCode(e))
  if (action === 'getPnL') return addCors(getPnL(e))
  if (action === 'disconnect') return addCors(handleDisconnect())

  return json({ error: 'Unknown action' })
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

function buildAuthUrl() {
  const props = getProps()
  const clientId = props.getProperty('QUICKBOOKS_CLIENT_ID')
  const redirectUri = props.getProperty('REDIRECT_URI') || ScriptApp.getService().getUrl()
  const state = Utilities.getUuid()
  props.setProperty('OAUTH_STATE', state)

  const params = {
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: state,
  }
  return QB_BASE + '?' + Object.entries(params).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&')
}

function handleOAuthCallback(e) {
  const props = getProps()
  const savedState = props.getProperty('OAUTH_STATE')

  if (e.parameter.state !== savedState) {
    return HtmlService.createHtmlOutput('<p>Invalid state. Please try connecting again.</p>')
  }

  const code = e.parameter.code
  const realmId = e.parameter.realmId

  if (!code) {
    return HtmlService.createHtmlOutput('<p>Authorization failed: no code received.</p>')
  }

  try {
    exchangeCodeForTokens(code, realmId)
    const frontendUrl = props.getProperty('FRONTEND_URL') || ''
    return HtmlService.createHtmlOutput(
      `<p>Connected! <a href="${frontendUrl}">Return to dashboard</a></p>` +
      `<script>if(window.opener){window.opener.postMessage('qb-connected','*');window.close()}</script>`
    )
  } catch (err) {
    return HtmlService.createHtmlOutput('<p>Token exchange failed: ' + err.message + '</p>')
  }
}

function exchangeCodeForTokens(code, realmId) {
  const props = getProps()
  const clientId = props.getProperty('QUICKBOOKS_CLIENT_ID')
  const clientSecret = props.getProperty('QUICKBOOKS_CLIENT_SECRET')
  const redirectUri = props.getProperty('REDIRECT_URI') || ScriptApp.getService().getUrl()

  const credentials = Utilities.base64Encode(clientId + ':' + clientSecret)
  const res = UrlFetchApp.fetch(QB_TOKEN_URL, {
    method: 'post',
    headers: {
      Authorization: 'Basic ' + credentials,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    payload: 'grant_type=authorization_code&code=' + encodeURIComponent(code) +
      '&redirect_uri=' + encodeURIComponent(redirectUri),
    muteHttpExceptions: true,
  })

  const data = JSON.parse(res.getContentText())
  if (!data.access_token) throw new Error(data.error_description || 'No access token returned')

  props.setProperty('QB_ACCESS_TOKEN', data.access_token)
  props.setProperty('QB_REFRESH_TOKEN', data.refresh_token)
  props.setProperty('QB_REALM_ID', realmId)
  props.setProperty('QB_TOKEN_EXPIRY', String(Date.now() + data.expires_in * 1000))
}

function refreshAccessToken() {
  const props = getProps()
  const clientId = props.getProperty('QUICKBOOKS_CLIENT_ID')
  const clientSecret = props.getProperty('QUICKBOOKS_CLIENT_SECRET')
  const refreshToken = props.getProperty('QB_REFRESH_TOKEN')

  const credentials = Utilities.base64Encode(clientId + ':' + clientSecret)
  const res = UrlFetchApp.fetch(QB_TOKEN_URL, {
    method: 'post',
    headers: {
      Authorization: 'Basic ' + credentials,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    payload: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(refreshToken),
    muteHttpExceptions: true,
  })

  const data = JSON.parse(res.getContentText())
  if (!data.access_token) throw new Error('Token refresh failed: ' + (data.error_description || ''))

  props.setProperty('QB_ACCESS_TOKEN', data.access_token)
  props.setProperty('QB_TOKEN_EXPIRY', String(Date.now() + data.expires_in * 1000))
  if (data.refresh_token) props.setProperty('QB_REFRESH_TOKEN', data.refresh_token)

  return data.access_token
}

function getAccessToken() {
  const props = getProps()
  const expiry = parseInt(props.getProperty('QB_TOKEN_EXPIRY') || '0', 10)
  // Refresh 5 minutes before expiry
  if (Date.now() > expiry - 300000) return refreshAccessToken()
  return props.getProperty('QB_ACCESS_TOKEN')
}

function isConnected() {
  const props = getProps()
  return !!(props.getProperty('QB_ACCESS_TOKEN') && props.getProperty('QB_REALM_ID'))
}

function handleExchangeCode(e) {
  const code = e.parameter.code
  const realmId = e.parameter.realmId
  if (!code || !realmId) return json({ error: 'Missing code or realmId' })
  try {
    exchangeCodeForTokens(code, realmId)
    return json({ ok: true })
  } catch (err) {
    return json({ error: err.message })
  }
}

function handleDisconnect() {
  const props = getProps()
  const token = props.getProperty('QB_REFRESH_TOKEN')
  if (token) {
    try {
      const clientId = props.getProperty('QUICKBOOKS_CLIENT_ID')
      const clientSecret = props.getProperty('QUICKBOOKS_CLIENT_SECRET')
      const credentials = Utilities.base64Encode(clientId + ':' + clientSecret)
      UrlFetchApp.fetch(QB_REVOKE_URL, {
        method: 'post',
        headers: { Authorization: 'Basic ' + credentials, 'Content-Type': 'application/json' },
        payload: JSON.stringify({ token }),
        muteHttpExceptions: true,
      })
    } catch (_) {}
  }
  props.deleteProperty('QB_ACCESS_TOKEN')
  props.deleteProperty('QB_REFRESH_TOKEN')
  props.deleteProperty('QB_REALM_ID')
  props.deleteProperty('QB_TOKEN_EXPIRY')
  return json({ ok: true })
}

// ── QuickBooks Report API ─────────────────────────────────────────────────────

function getPnL(e) {
  const start = e.parameter.start || '2023-01-01'
  const end = e.parameter.end || new Date().toISOString().slice(0, 10)

  try {
    const props = getProps()
    const realmId = props.getProperty('QB_REALM_ID')
    const accessToken = getAccessToken()

    const url = QB_API_BASE + '/v3/company/' + realmId + '/reports/ProfitAndLoss' +
      '?start_date=' + start +
      '&end_date=' + end +
      '&summarize_column_by=Month' +
      '&accounting_method=Accrual' +
      '&minorversion=65'

    const res = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
        Accept: 'application/json',
      },
      muteHttpExceptions: true,
    })

    const status = res.getResponseCode()
    if (status === 401) {
      // Token may have just expired — retry once after forced refresh
      const newToken = refreshAccessToken()
      const retry = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + newToken, Accept: 'application/json' },
        muteHttpExceptions: true,
      })
      return json(JSON.parse(retry.getContentText()))
    }

    return json(JSON.parse(res.getContentText()))
  } catch (err) {
    return json({ error: err.message })
  }
}
