import axios from 'axios'

// We import the store lazily to avoid circular dependency issues
let getAuthState: () => { token: string | null; refreshToken: () => Promise<string | null>; logout: () => void }

export function setAuthStateGetter(fn: typeof getAuthState) {
  getAuthState = fn
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

api.interceptors.request.use((config) => {
  // Prevent the browser from serving cached responses across user sessions
  config.headers['Cache-Control'] = 'no-cache'
  config.headers['Pragma'] = 'no-cache'

  if (getAuthState) {
    const token = getAuthState().token
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  // Send active company so backend scopes data correctly
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('active-company')
      if (stored) {
        const parsed = JSON.parse(stored) as { state?: { activeCompanyId?: string } }
        const id = parsed?.state?.activeCompanyId
        if (id) config.headers['X-Company-Id'] = id
      }
    } catch { /* ignore */ }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    // Only intercept authenticated requests (those with a Bearer token).
    // Auth endpoints (login, register, verify) have no Authorization header
    // and must never trigger the refresh/logout cycle.
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh')
    const hadAuthHeader = !!originalRequest?.headers?.Authorization
    if (
      error.response?.status === 401 &&
      getAuthState &&
      !originalRequest?._retry &&
      !isRefreshCall &&
      hadAuthHeader
    ) {
      originalRequest._retry = true
      const { refreshToken, logout } = getAuthState()
      const newToken = await refreshToken()
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api.request(originalRequest)
      }
      logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then((r) => r.data)
export const register = (email: string, password: string, company_name: string) =>
  api.post('/auth/register', { email, password, company_name }).then((r) => r.data)
export const refreshSession = (refresh_token: string) =>
  api.post('/auth/refresh', { refresh_token }).then((r) => r.data)
export const verifyEmail = (token: string) =>
  api.post('/auth/verify-email', { token }).then((r) => r.data)

// Company (single — current active)
export const getCompany = () => api.get('/company').then((r) => r.data)

// Companies (all companies the user belongs to)
export const getMyCompanies = () => api.get('/companies').then((r) => r.data)
export const createCompany = (name: string) => api.post('/companies', { name }).then((r) => r.data)
export const updateCompany = (data: object) => api.patch('/company', data).then((r) => r.data)
export const getCompanyUsers = () => api.get('/company/users').then((r) => r.data)

// Mailboxes
export const getMailboxes = () => api.get('/mailboxes').then((r) => r.data)
export const createMailbox = (data: object) => api.post('/mailboxes', data).then((r) => r.data)
export const deleteMailbox = (id: string) => api.delete(`/mailboxes/${id}`).then((r) => r.data)

// Target Groups
export const getTargetGroups = () => api.get('/target-groups').then((r) => r.data)
export const getTargetGroup = (id: string) => api.get(`/target-groups/${id}`).then((r) => r.data)
export const createTargetGroup = (data: object) =>
  api.post('/target-groups', data).then((r) => r.data)
export const deleteTargetGroup = (id: string) =>
  api.delete(`/target-groups/${id}`).then((r) => r.data)

// Leads
export const getLeads = (params?: object) =>
  api.get('/leads', { params }).then((r) => r.data)
export const previewLeads = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/leads/preview', fd).then((r) => r.data)
}
export const importLeads = (file: File, campaign_id: string, column_map?: object) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('campaign_id', campaign_id)
  if (column_map) fd.append('column_map', JSON.stringify(column_map))
  return api.post('/leads/import', fd).then((r) => r.data)
}
export const updateLead = (id: string, data: object) =>
  api.patch(`/leads/${id}`, data).then((r) => r.data)
export const downloadLeadsTemplate = () =>
  api.get('/leads/template', { responseType: 'blob' }).then((r) => {
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads_template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  })

// Sequences
export const getSequences = () => api.get('/sequences').then((r) => r.data)
export const getSequence = (id: string) => api.get(`/sequences/${id}`).then((r) => r.data)
export const createSequence = (data: object) => api.post('/sequences', data).then((r) => r.data)
export const deleteSequence = (id: string) =>
  api.delete(`/sequences/${id}`).then((r) => r.data)
export const addStep = (sequenceId: string, data: object) =>
  api.post(`/sequences/${sequenceId}/steps`, data).then((r) => r.data)
export const updateStep = (sequenceId: string, stepId: string, data: object) =>
  api.patch(`/sequences/${sequenceId}/steps/${stepId}`, data).then((r) => r.data)
export const deleteStep = (sequenceId: string, stepId: string) =>
  api.delete(`/sequences/${sequenceId}/steps/${stepId}`).then((r) => r.data)

// Campaigns
export const getCampaigns = (params?: object) => api.get('/campaigns', { params }).then((r) => r.data)
export const getCampaign = (id: string) => api.get(`/campaigns/${id}`).then((r) => r.data)
export const createCampaign = (data: object) => api.post('/campaigns', data).then((r) => r.data)
export const updateCampaign = (id: string, data: object) =>
  api.patch(`/campaigns/${id}`, data).then((r) => r.data)
export const deleteCampaign = (id: string) =>
  api.delete(`/campaigns/${id}`).then((r) => r.data)
export const getCampaignStats = (id: string) =>
  api.get(`/campaigns/${id}/stats`).then((r) => r.data)
export const triggerNextStep = (id: string, force: boolean) =>
  api.post(`/campaigns/${id}/trigger-next-step`, { force }).then((r) => r.data)
export const getCampaignEmailLogs = (
  id: string,
  params: { page?: number; limit?: number; status?: 'sent' | 'failed' }
) => api.get(`/campaigns/${id}/email-logs`, { params }).then((r) => r.data)

// Unsubscribe (public — no auth required)
export const unsubscribe = (token: string) =>
  api.post('/unsubscribe', { token }).then((r) => r.data)

// Admin (global_admin only)
export const getAdminPendingMailboxes = () => api.get('/admin/mailboxes').then((r) => r.data)
export const approveMailbox = (id: string) =>
  api.patch(`/admin/mailboxes/${id}/approve`).then((r) => r.data)
export const getAdminMailboxLimits = () => api.get('/admin/mailboxes/limits').then((r) => r.data)
export const updateMailboxEmailLimits = (
  id: string,
  limits: { daily_email_limit: number; weekly_email_limit: number }
) => api.patch(`/admin/mailboxes/${id}/limits`, limits).then((r) => r.data)

// Org management
export const getInvitations = () => api.get('/org/invitations').then((r) => r.data)
export const sendInvitation = (email: string) =>
  api.post('/org/invitations', { email }).then((r) => r.data)
export const revokeInvitation = (id: string) =>
  api.delete(`/org/invitations/${id}`).then((r) => r.data)
export const checkInvitation = (token: string) =>
  api.get(`/org/invitations/check?token=${token}`).then((r) => r.data)
export const acceptInvitationRegister = (token: string, password: string) =>
  api.post('/org/accept-invite/register', { token, password }).then((r) => r.data)
export const acceptInvitationLogin = (token: string, password: string) =>
  api.post('/org/accept-invite/login', { token, password }).then((r) => r.data)
export const removeMember = (id: string) =>
  api.delete(`/org/members/${id}`).then((r) => r.data)
