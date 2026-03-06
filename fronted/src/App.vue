<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #0a0f1e;
  color: #e0e0e0;
  font-family: 'Inter', sans-serif;
}

.app {
  width: 100vw;
  height: 100vh;
}
</style>