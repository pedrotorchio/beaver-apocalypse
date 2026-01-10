import { createApp } from 'vue';
import Devtools from './Devtools.vue';
import type { CoreModules } from '../core/GameInitializer';
import { pinia } from './store'
/**
 * Initializes the Vue application for devtools UI.
 * Mounts the Devtools component to the #controls element in the DOM.
 * Creates the Pinia instance here (where it's used with app.use).
 * The store is already created in GameInitializer using setActivePinia.
 * 
 * @param core - The core game modules
 */
export function initDevtools(core: CoreModules): void {
  const controlsElement = document.getElementById('controls') !;
  
  const app = createApp(Devtools, { core });
  app.use(pinia);
  app.mount(controlsElement);
}
