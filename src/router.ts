
import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from './components/AppLayout.vue';
import Login from './components/Login.vue';
import Dashboard from './components/Dashboard.vue';
import Register from './components/Register.vue';
import Faq from './components/Faq.vue';
import CarteiraDigital from './components/CarteiraDigital.vue';
import { getAuth } from 'firebase/auth';

const routes = [
  // Rotas não autenticadas
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/faq', name: 'Faq', component: Faq },

  // Rotas autenticadas com o layout persistente
  {
    path: '/app',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/app/dashboard' }, // Redireciona /app para /app/dashboard
      { path: 'dashboard', name: 'Dashboard', component: Dashboard },
      { path: 'carteira', name: 'CarteiraDigital', component: CarteiraDigital },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const auth = getAuth();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const isAuthenticated = auth.currentUser;

  if (requiresAuth && !isAuthenticated) {
    next('/login');
  } else if ((to.name === 'Login' || to.name === 'Register') && isAuthenticated) {
    // Se o usuário logado tentar acessar login, vai para o dashboard principal
    next('/app/dashboard');
  } else {
    next();
  }
});

// Ajuste no link do menu lateral, se necessário
// O App.vue ou main.ts deve ter router.replace('/app/dashboard') no login bem-sucedido.

export default router;
