<template>
  <div id="controls">
    <h2>Controls</h2>
    <p>
      <strong>Movement:</strong>
      <span :class="{ key: true, active: inputState.moveLeft }" data-key="a">A</span> (left),
      <span :class="{ key: true, active: inputState.moveRight }" data-key="d">D</span> (right),
      <span :class="{ key: true, active: inputState.jump }" data-key="w">W</span> (jump)
    </p>
    <p>
      <strong>Aim:</strong>
      <span :class="{ key: true, active: inputState.aimUp || inputState.aimDown }" data-key="arrow">Arrow Keys</span>
    </p>
    <p>
      <strong>Fire:</strong>
      <span :class="{ key: true, active: inputState.fire || inputState.charging }" data-key="space">Space</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { CoreModules } from '../core/GameInitializer';
import type { InputState } from '../core/managers/InputManager';

interface Props {
  core: CoreModules;
}

const props = defineProps<Props>();

const inputState = ref<InputState>({
  moveLeft: false,
  moveRight: false,
  jump: false,
  aimUp: false,
  aimDown: false,
  fire: false,
  charging: false,
});

let animationFrameId: number | null = null;

const updateInputState = () => {
  inputState.value = props.core.inputManager.getInputState();
  animationFrameId = requestAnimationFrame(updateInputState);
};

onMounted(() => {
  updateInputState();
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style>
#controls {
  margin-top: 20px;
  text-align: center;
}

#controls h2 {
  margin-bottom: 10px;
}

#controls p {
  margin: 5px 0;
}

#controls .key {
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
  transition: background-color 0.1s ease;
}

#controls .key.active {
  background-color: #8B4A4A;
  color: #fff;
}
</style>
