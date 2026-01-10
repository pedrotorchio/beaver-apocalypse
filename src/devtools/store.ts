import { createPinia, defineStore, setActivePinia } from 'pinia';

/**
 * Devtools store for managing devtools UI state.
 * This store can be updated from anywhere in the application.
 */

export const pinia = createPinia();
setActivePinia(pinia);

export const useDevtoolsStore = defineStore('devtools', {
    state: () => ({
        tabs: {} as Record<string, { key: string, value: unknown}[]>,
    }),
    actions: {
        addTab(tab: string): TabUpdateObject {
            // Use object spread to ensure reactivity for new properties
            this.tabs = { ...this.tabs, [tab]: [] };
            return {
                update: (key: string, value: unknown) => this.update(tab, key, value)
            }
        },
        update(tab: string, key: string, data: unknown) {
            const existingTabData = this.tabs[tab];
            this.tabs = { ...this.tabs, [tab]: { ...existingTabData, [key]: data }}
        },
    },
});

export type TabUpdateObject = {
    update: (key: string, value: unknown) => void;
}
export type DevtoolsStore = ReturnType<typeof useDevtoolsStore>