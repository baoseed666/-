import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/onboarding',
      name: 'Onboarding',
      component: () => import('../views/OnboardingView.vue'),
    },
    { path: '/', component: () => import('../views/HomeView.vue') },
    { path: '/login', component: () => import('../views/LoginView.vue') },
    { path: '/challenge/:id', component: () => import('../views/ChallengeView.vue'), meta: { requiresAuth: true } },
    { path: '/report/:id', component: () => import('../views/ReportView.vue'), meta: { requiresAuth: true } },
    { path: '/leaderboard', component: () => import('../views/LeaderboardView.vue'), meta: { requiresAuth: true } },
    { path: '/profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/points', component: () => import('../views/PointsView.vue'), meta: { requiresAuth: true } },
    { path: '/emotion', component: () => import('../views/EmotionView.vue'), meta: { requiresAuth: true } },
    { path: '/map', component: () => import('../views/MapView.vue') },
    { path: '/metaverse', component: () => import('../views/MetaverseView.vue') },
    { path: '/opc', component: () => import('../views/OpcView.vue'), meta: { requiresAuth: true } },
    { path: '/dashboard', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to) => {
  if (to.path === '/' && !localStorage.getItem('koumen_onboarding_done')) {
    return { path: '/onboarding' }
  }
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) return '/login';
});

export default router;
