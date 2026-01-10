<template>
  <div id="devtools">
    <div v-if="Object.keys(tabs).length > 0" class="tabs-container">
      <div v-for="(tabItems, tabName) in tabs" :key="tabName" class="tab-group">
        <div class="tab-name">{{ tabName }}</div>
        <div v-for="(item, index) in tabItems" :key="index" class="tab-item">
          <JSONValue :value="item" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDevtoolsStore } from './store';
import JSONValue from './JSONValue.vue';
import type { CoreModules } from '../core/GameInitializer';
  
const props = defineProps<{
  core: CoreModules;
}>();

const devtoolsStore = useDevtoolsStore();
const tabs = computed(() => devtoolsStore.tabs);
</script>

<style>
#devtools {
  padding: 10px;
  color: #fff;
  font-family: Arial, sans-serif;
  height: 100%;
}

.tabs-container {
  height: 100%;
  max-height: 100%;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
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
