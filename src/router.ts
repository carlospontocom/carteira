
import { createRouter, createWebHistory } from 'vue-router';
import Login from './components/Login.vue';
import Dashboard from './components/Dashboard.vue';
import Register from './components/Register.vue';
import { getAuth } from 'firebase/auth';

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login,
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }, // Rota protegida
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const auth = getAuth();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const isAuthenticated = auth.currentUser;

  if (requiresAuth && !isAuthenticated) {
    // Se a rota requer autenticação e o usuário não está logado, redirecione para o login
    next('/');
  } else if ((to.name === 'Login' || to.name === 'Register') && isAuthenticated) {
    // Se o usuário está logado e tenta acessar as páginas de Login/Registro, redirecione para o dashboard
    next('/dashboard');
  } else {
    // Caso contrário, permita a navegação
    next();
  }
});

export default router;
