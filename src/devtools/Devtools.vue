<template>
  <div id="devtools">
    <div v-if="Object.keys(tabs).length > 0" class="tabs-container">
      <div v-for="(tabItems, tabName) in tabs" :key="tabName" class="tab-group">
        <div class="tab-name">{{ tabName }}</div>
        <div v-for="(item, index) in tabItems" :key="index" class="tab-item">
          {{ item }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDevtoolsStore } from './store';
import type { CoreModules } from '../core/GameInitializer';

const props = defineProps<{
  core: CoreModules;
}>();
const devtoolsStore = useDevtoolsStore();
const tabs = computed(() => devtoolsStore.tabs);
</script>

<style>
#devtools {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 10px;
  color: #fff;
  font-family: Arial, sans-serif;
}

.tabs-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  max-height: 150px;
  overflow-y: auto;
}

.tab-group {
  padding: 5px 10px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-right: 10px;
}

.tab-name {
  font-weight: bold;
  margin-bottom: 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 3px;
}

.tab-item {
  padding: 2px 0;
  font-size: 0.9em;
}
</style>
