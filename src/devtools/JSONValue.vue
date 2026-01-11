<template>
  <div class="json-value" :class="{ 'json-nested': depth > 0 }">
    <span v-if="value === null" class="json-null">null</span>
    <template v-else-if="isToggled && !isLeaf">  
      <span class="json-bracket">{{ Array.isArray(value) ? '[' : '{' }}</span>
      <div v-if="entries.length > 0" class="json-content">
        <div
        v-for="([key, val], index) in entries"
        :key="key"
        class="json-item"
        :style="{ paddingLeft: `${(depth + 1) * INTENDATION}px` }"
        >
        <span v-if="key !== ''" 
          @click.self="toggle"
          :class="{ 
            'json-key': true, 
            'json-toggled': isToggled, 
            clickable: !alwaysShow 
          }">{{ Array.isArray(value) ? `${key}:` : `"${key}":` }}</span>
        <JSONValue :value="val" :depth="depth + 1" />
        <span v-if="index < entries.length - 1" class="json-comma">,</span>
      </div>
    </div>
    <span class="json-bracket">{{ Array.isArray(value) ? ']' : '}' }}</span>
  </template>
  <template v-else-if="!isToggled && !isLeaf">
      <span @click.self="toggle" :class="{ 'json-bracket': true, clickable: !alwaysShow }">{{ Array.isArray(value) ? '[]' : '{}' }}</span>
  </template>  
  <span v-else-if="isLeaf" class="json-boolean">{{ value }}</span>
  </div>
</template>
<script lang="ts">

export const INTENDATION = 5;

</script>
<script setup lang="ts">
import { computed, ref } from 'vue';

interface Props {
  value: unknown;
  depth?: number;
  alwaysShow?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
});
const isToggled = ref(props.alwaysShow);
const toggle = () => {
  if (props.alwaysShow) return;
  isToggled.value = !isToggled.value;
}

const entries = computed(() => {
  if (Array.isArray(props.value)) {
    return props.value.map((item, index) => [String(index), item] as [string, unknown]);
  }
  if (typeof props.value === 'object' && props.value !== null) {
    return Object.entries(props.value as Record<string, unknown>);
  }
  return [];
});
const isLeaf = computed(() => {
  return !Array.isArray(props.value) && typeof props.value !== 'object' && props.value !== null;
});

</script>

<style scoped>
  .clickable {
    cursor: pointer;
  }
.json-value {
  display: inline;
}

.json-nested {
  display: block;
}

.json-content {
    display: flex;
    flex-direction: column;
    gap: 5px;
    letter-spacing: 1px;
}

.json-item {
  display: flex;
  align-items: flex-start;
}

.json-key {
  color: #9cdcfe;
  margin-right: 6px;
}

.json-string {
  color: #ce9178;
}

.json-number {
  color: #b5cea8;
}

.json-boolean {
  color: #569cd6;
}

.json-null {
  color: #808080;
}

.json-bracket {
  color: #d4d4d4;
  font-weight: bold;
}

.json-comma {
  color: #d4d4d4;
}
</style>
