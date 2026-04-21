import axios from 'axios'

const http = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

http.interceptors.response.use(
  res => res.data,
  err => {
    console.error('[API Error]', err)
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (username, password) =>
    http.post('/api/auth/login', { username, password }),

  register: (username, password, nickname) =>
    http.post('/api/auth/register', { username, password, nickname })
}

export const simulationApi = {
  run: (params) => http.post('/api/simulation/run', params)
}

export const experimentApi = {
  /**
   * 分页列表：name 模糊；sortBy=id|createdTime；order=asc|desc
   */
  list: (params = {}) =>
    http.get('/api/experiments', { params }),

  getById: id =>
    http.get(`/api/experiments/${id}`),

  create: data =>
    http.post('/api/experiments', data),

  update: (id, data) =>
    http.put(`/api/experiments/${id}`, data),

  remove: id =>
    http.delete(`/api/experiments/${id}`)
}
