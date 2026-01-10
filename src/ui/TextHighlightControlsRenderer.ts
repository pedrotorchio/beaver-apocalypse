import { CoreModules } from "../core/GameInitializer";
import { TabUpdateObject } from "../devtools/store";

export interface TextHighlightControlsRendererOptions {
    core: CoreModules;
}

/**
 * Highlights control keys in the HTML controls section based on current input state.
 * 
 * @deprecated This class is deprecated. Use the Vue component in devtools/Controls.vue instead.
 * This class is kept for reference but is no longer used since controls are now managed by Vue.
 *
 * This class updates the DOM directly to change the visual appearance of control
 * keys in the #controls section of index.html. Keys are highlighted when pressed
 * by adding the 'active' class, which applies a desaturated bloody red background.
 *
 * The renderer maps game input states to HTML elements:
 * - A key: moveLeft input
 * - D key: moveRight input
 * - W key: jump input
 * - Arrow Keys: aimUp or aimDown input
 * - Space: fire or charging input
 */
export class TextHighlightControlsRenderer {
    private tabStorage: TabUpdateObject;
    constructor(private options: TextHighlightControlsRendererOptions) {
        const {devtools} = this.options.core;
        this.tabStorage =devtools.addTab('Controls')
    }
    render() {
        const inputState = this.options.core.inputManager.getState();
        this.tabStorage.update('left', inputState.moveLeft);
        this.tabStorage.update('right', inputState.moveRight);
        this.tabStorage.update('jump', inputState.jump);
        this.tabStorage.update('fire', inputState.fire);
    }
}
