const BASE_URL = '/api'

let accessToken = null
export const setAccessToken = (token) => { accessToken = token }
export const getAccessToken = () => accessToken
export const clearTokens = () => {
  accessToken = null
  localStorage.removeItem('manna_refresh_token')
}

async function request(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  let res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })

  if (res.status === 401 && accessToken) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`
      res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })
    } else {
      clearTokens()
      window.location.href = '/login'
      return
    }
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud')
  return data
}

async function tryRefresh() {
  const refreshToken = localStorage.getItem('manna_refresh_token')
  if (!refreshToken) return false
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    setAccessToken(data.accessToken)
    localStorage.setItem('manna_refresh_token', data.refreshToken)
    return true
  } catch { return false }
}

const get   = (url)       => request(url)
const post  = (url, body) => request(url, { method: 'POST',   body: JSON.stringify(body) })
const put   = (url, body) => request(url, { method: 'PUT',    body: JSON.stringify(body) })
const patch = (url, body) => request(url, { method: 'PATCH',  body: JSON.stringify(body) })
const del   = (url)       => request(url, { method: 'DELETE' })

export const api = {
  auth: {
    register: (b) => post('/auth/register', b),
    login:    (b) => post('/auth/login', b),
    logout:   ()  => post('/auth/logout', { refreshToken: localStorage.getItem('manna_refresh_token') }),
  },
  family: {
    get:    ()  => get('/family'),
    update: (b) => patch('/family', b),
    invite: (b) => post('/family/invite', b),
  },
  dashboard: {
    get:     (month) => get(`/dashboard${month ? `?month=${month}` : ''}`),
    history: ()      => get('/dashboard/history'),
  },
  incomes: {
    list:    (month) => get(`/incomes${month ? `?month=${month}` : ''}`),
    summary: (month) => get(`/incomes/summary${month ? `?month=${month}` : ''}`),
    create:  (b)     => post('/incomes', b),
    delete:  (id)    => del(`/incomes/${id}`),
  },
  expenses: {
    list:   (params = {}) => get(`/expenses?${new URLSearchParams(params)}`),
    create: (b)           => post('/expenses', b),
    update: (id, b)       => patch(`/expenses/${id}`, b),
    delete: (id)          => del(`/expenses/${id}`),
  },
  tithe: {
    get:     (month) => get(`/tithe${month ? `?month=${month}` : ''}`),
    pay:     (b)     => post('/tithe/pay', b),
    history: ()      => get('/tithe/history'),
  },
  budget: {
    get:            (month) => get(`/budget${month ? `?month=${month}` : ''}`),
    setCategory:    (b)     => put('/budget/category', b),
    setSubcategory: (b)     => put('/budget/subcategory', b),
    suggest:         (month) => get(`/budget/suggest?month=${month}`),
    copy:            (b)     => post('/budget/copy', b),
    customSubs:      (pid)   => get(`/budget/custom-subs${pid ? `?parent_id=${pid}` : ''}`),
    createCustomSub: (b)     => post('/budget/custom-subs', b),
    updateCustomSub: (id, b) => patch(`/budget/custom-subs/${id}`, b),
    deleteCustomSub: (id)    => del(`/budget/custom-subs/${id}`),
    renamedSubs:     ()      => get('/budget/renamed-subs'),
    renameSystemSub: (b)     => patch('/budget/renamed-subs', b),
  },
  debts: {
    list:    ()        => get('/debts'),
    create:  (b)       => post('/debts', b),
    update:  (id, b)   => patch(`/debts/${id}`, b),
    delete:  (id)      => del(`/debts/${id}`),
    payment: (id, b)   => post(`/debts/${id}/payment`, b),
  },
  savings: {
    list:   ()       => get('/savings'),
    create: (b)      => post('/savings', b),
    update: (id, b)  => patch(`/savings/${id}`, b),
    delete: (id)     => del(`/savings/${id}`),
    add:    (id, b)  => post(`/savings/${id}/add`, b),
  },
  donations: {
    list:   ()       => get('/donations'),
    create: (b)      => post('/donations', b),
    update: (id, b)  => patch(`/donations/${id}`, b),
    delete: (id)     => del(`/donations/${id}`),
    pay:    (id, b)  => post(`/donations/${id}/pay`, b),
  },
  profile: {
    update:         (b) => patch('/profile', b),
    changePassword: (b) => post('/profile/password', b),
  },
  invitations: {
    check:  (token) => get(`/invitations/check?token=${token}`),
    accept: (b)     => post('/invitations/accept', b),
    list:   ()      => get('/invitations'),
    invite: (b)     => post('/invitations', b),
    cancel: (id)    => del(`/invitations/${id}`),
  },
}

export default api
