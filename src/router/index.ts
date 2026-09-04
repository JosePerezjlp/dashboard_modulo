import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('../views/DashboardHome.vue') },
        { path: 'productos', name: 'products', component: () => import('../views/ProductsView.vue') },
        { path: 'productos/nuevo', name: 'product-new', component: () => import('../views/ProductFormView.vue') },
        { path: 'productos/:id', name: 'product-edit', component: () => import('../views/ProductFormView.vue') },
        { path: 'pedidos', name: 'orders', component: () => import('../views/OrdersView.vue') },
        { path: 'pedidos/:id', name: 'order-detail', component: () => import('../views/OrderDetailView.vue') },
        { path: 'estadisticas', name: 'stats', component: () => import('../views/StatsView.vue') },
        { path: 'configuracion', name: 'settings', component: () => import('../views/SettingsView.vue') },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  if (!to.meta.public && !token) {
    return { name: 'login' };
  }
  if (to.name === 'login' && token) {
    return { name: 'home' };
  }
});

export default router;
