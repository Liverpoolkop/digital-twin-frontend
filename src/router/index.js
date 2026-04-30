import { createRouter, createWebHistory } from 'vue-router'

const normalizeRole = role => (role || '').toUpperCase()

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('dt_token')
  const role = normalizeRole(localStorage.getItem('dt_role'))

  if (to.meta.requiresAuth && !token) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresAuth && token && !role) {
    localStorage.removeItem('dt_token')
    localStorage.removeItem('dt_username')
    localStorage.removeItem('dt_userId')
    localStorage.removeItem('dt_role')
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  const allowedRoles = Array.isArray(to.meta.roles)
    ? to.meta.roles.map(normalizeRole)
    : null

  if (allowedRoles && !allowedRoles.includes(role)) {
    next({ name: 'admin' })
    return
  }

  next()
})

export default router
