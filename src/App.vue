<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';

const route = useRoute();

// Hide bottom nav on certain pages
const showNav = computed(() => {
  const hiddenRoutes = ['/add', '/settings', '/trends'];
  return !hiddenRoutes.some(r => route.path === r) && !route.path.startsWith('/item/');
});
</script>

<template>
  <div class="app-shell">
    <router-view />
    <BottomNav v-if="showNav" />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
  background:
    linear-gradient(150deg, rgba(255, 255, 255, 0.52), transparent 38%),
    radial-gradient(circle at 100% 0, rgba(165, 174, 255, 0.18), transparent 32rem);
  color: var(--color-text-primary);
}
</style>
