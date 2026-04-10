import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue')
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('../views/ProductManagement.vue')
    },
    {
      path: '/content',
      name: 'content',
      component: () => import('../views/ContentManager.vue')
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/Orders.vue')
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: () => import('../views/Inventory.vue')
    },
    {
      path: '/ledger',
      name: 'ledger',
      component: () => import('../views/Ledger.vue')
    },
    {
      path: '/vendors',
      name: 'vendors',
      component: () => import('../views/Vendors.vue')
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: () => import('../views/Expenses.vue')
    },
    {
      path: '/inquiries',
      name: 'inquiries',
      component: () => import('../views/InquiryManager.vue')
    },
    {
      path: '/subscribers',
      name: 'subscribers',
      component: () => import('../views/SubscriberManager.vue')
    },
    {
      path: '/blog',
      name: 'blog',
      component: () => import('../views/BlogManager.vue')
    },
    {
      path: '/policies',
      name: 'policies',
      component: () => import('../views/PolicyManager.vue')
    },
    {
      path: '/employees',
      name: 'employees',
      component: () => import('../views/EmployeeManager.vue')
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('../views/NotificationManager.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/AdminProfile.vue')
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (!authStore.isAuthenticated && !to.meta.public) {
    next('/login')
  } else if (authStore.isAuthenticated && to.name === 'login') {
    next('/')
  } else {
    next()
  }
})

export default router
