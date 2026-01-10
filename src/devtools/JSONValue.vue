<template>
  <div class="json-value" :class="{ 'json-nested': depth > 0 }">
    <template v-if="value === null">
      <span class="json-null">null</span>
    </template>
    <template v-else-if="typeof value === 'boolean'">
      <span class="json-boolean">{{ value }}</span>
    </template>
    <template v-else-if="typeof value === 'number'">
      <span class="json-number">{{ value }}</span>
    </template>
    <template v-else-if="typeof value === 'string'">
      <span class="json-string">"{{ value }}"</span>
    </template>
    <template v-else-if="Array.isArray(value)">
      <span class="json-bracket">[</span>
      <div v-if="value.length > 0" class="json-content">
        <div
          v-for="(item, index) in value"
          :key="index"
          class="json-item"
          :style="{ paddingLeft: `${(depth + 1) * 16}px` }"
        >
          <span class="json-key">{{ index }}:</span>
          <JSONValue :value="item" :depth="depth + 1" />
          <span v-if="index < value.length - 1" class="json-comma">,</span>
        </div>
      </div>
      <span class="json-bracket">]</span>
    </template>
    <template v-else-if="typeof value === 'object'">
      <span class="json-bracket">{</span>
      <template v-if="objectEntries.length > 0">
        <div class="json-content">
          <div
            v-for="([key, val], index) in objectEntries"
            :key="key"
            class="json-item"
            :style="{ paddingLeft: `${(depth + 1) * 16}px` }"
          >
            <p style="display: flex; align-items: center;">
                <span class="json-key">"{{ key }}":</span>
                <JSONValue :value="val" :depth="depth + 1" />
                <span
                  v-if="index < objectEntries.length - 1"
                  class="json-comma"
                  >,</span
                >
            </p>
          </div>
        </div>
      </template>
      <span class="json-bracket">}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  value: unknown;
  depth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
});

const objectEntries = computed(() => {
  if (typeof props.value === 'object' && props.value !== null && !Array.isArray(props.value)) {
    return Object.entries(props.value as Record<string, unknown>);
  }
  return [];
});
</script>

<style scoped>
.json-value {
  display: inline;
}

.json-nested {
  display: block;
}

.json-content {
  display: block;
}

.json-item {
  display: block;
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
