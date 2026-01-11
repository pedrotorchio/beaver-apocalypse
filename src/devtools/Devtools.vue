<template>
  <Teleport to="body">
    <div v-if="toggled" id="devtools">
      <div v-if="Object.keys(tabs).length > 0" class="tabs-container">
        <div v-for="(tabItems, tabName) in tabs" :key="tabName" class="tab-group">
          <div class="tab-name">{{ tabName }}</div>
          <div class="tab-content">
            <JSONValue :value="tabItems" always-show />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useDevtoolsStore } from './store';
import JSONValue from './JSONValue.vue';
import type { CoreModules } from '../core/GameInitializer';
  
const props = defineProps<{
  core: CoreModules;
}>();

const devtoolsStore = useDevtoolsStore();
const tabs = computed(() => devtoolsStore.tabs);
const toggled = ref(false);
// listen for keyboard events and toggle devtools when "ctrl" is pressed 
// add cleanup as well

const toggleDevtools = (e: KeyboardEvent) => {
  if (e.altKey) toggled.value = !toggled.value;
};

onMounted(() => {
  window.addEventListener('keydown', toggleDevtools);
});

onUnmounted(() => {
  window.removeEventListener('keydown', toggleDevtools);
});
</script>

<style>
#devtools {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  background-color: rgba(0, 0, 0, 0.95);
  padding: 10px;
  box-sizing: border-box;
  color: #fff;
  font-family: Arial, sans-serif;
}

.tabs-container {
  height: 100%;
  max-height: 100%;
  display: flex;
  gap: 5px;
  flex-wrap: nowrap;
}

.tab-group {
  padding: 5px 10px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-right: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tab-name {
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.tab-content {
  height: 100%;
  overflow-y: auto;
  &::-webkit-scrollbar {
    display: none;
  }
  & {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
}
</style>
