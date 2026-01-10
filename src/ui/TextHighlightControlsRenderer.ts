import { CoreModules } from "../core/GameInitializer";

export interface TextHighlightControlsRendererOptions {
  core: CoreModules;
}

/**
 * Highlights control keys in the HTML controls section based on current input state.
 *
 * This class updates the DOM directly to change the visual appearance of control
 * keys in the .controls section of index.html. Keys are highlighted when pressed
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
  private keyElements: Map<string, HTMLElement>;

  constructor(private options: TextHighlightControlsRendererOptions) {
    this.keyElements = new Map();
    this.initializeKeyElements();
  }

  /**
   * Finds and stores references to all key elements in the DOM.
   */
  private initializeKeyElements(): void {
    const controlsSection = document.querySelector(".controls");
    if (!controlsSection) {
      console.warn("Controls section not found in DOM");
      return;
    }

    // Find all key elements by their data-key attribute
    const keys = controlsSection.querySelectorAll<HTMLElement>(".key[data-key]");
    keys.forEach((element) => {
      const keyName = element.getAttribute("data-key");
      if (keyName) {
        this.keyElements.set(keyName, element);
      }
    });
  }

  /**
   * Updates the visual state of control keys based on current input.
   * Should be called each frame to keep the display current.
   */
  render(): void {
    const input = this.options.core.inputManager.getState();

    // Update individual movement keys
    this.updateKey("a", input.moveLeft);
    this.updateKey("d", input.moveRight);
    this.updateKey("w", input.jump);

    // Update arrow keys (highlight if either up or down is pressed)
    this.updateKey("arrow", input.aimUp || input.aimDown);

    // Update space key (highlight if fire or charging)
    this.updateKey("space", input.fire || input.charging);
  }

  /**
   * Updates a specific key element's active state.
   * @param keyName - The data-key attribute value
   * @param isActive - Whether the key should be highlighted
   */
  private updateKey(keyName: string, isActive: boolean): void {
    const element = this.keyElements.get(keyName);
    if (!element) {
      return;
    }

    if (isActive) {
      element.classList.add("active");
    } else {
      element.classList.remove("active");
    }
  }
}
