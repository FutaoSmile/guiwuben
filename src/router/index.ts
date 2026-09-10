import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '../pages/Home.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/add',
      name: 'item-form',
      component: () => import('../pages/ItemForm.vue'),
    },
    {
      path: '/item/:id',
      name: 'item-detail',
      component: () => import('../pages/ItemDetail.vue'),
    },
    {
      path: '/item/:id/edit',
      name: 'item-edit',
      component: () => import('../pages/ItemForm.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../pages/Settings.vue'),
    },
    {
      path: '/trends',
      name: 'trends',
      component: () => import('../pages/Trends.vue'),
    },
  ],
});

export default router;
