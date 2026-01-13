/**
 * Static utility class for loading and caching game assets.
 * 
 * This class provides:
 * - Async image loading with caching
 * - Asset loading state tracking
 * - Methods to check if all assets are loaded
 * 
 * Assets are loaded asynchronously and cached for reuse.
 * Use areAllAssetsLoaded() to check if all registered assets have finished loading.
 */
export class AssetLoader {
  private static loadedAssets: Map<string, HTMLImageElement> = new Map();
  private static loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private static registeredAssets: Set<string> = new Set();

  /**
   * Loads an image asset asynchronously.
   * @param key - Unique identifier for the asset
   * @param path - Path to the image file (can be Vite-imported URL or public path)
   * @returns Promise that resolves to the loaded HTMLImageElement
   */
  static async loadImage(key: string, path: string): Promise<HTMLImageElement> {
    if (this.loadedAssets.has(key)) {
      return this.loadedAssets.get(key)!;
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    this.registeredAssets.add(key);

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedAssets.set(key, img);
        this.loadingPromises.delete(key);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(key);
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  /**
   * Gets a previously loaded image asset.
   * @param key - Unique identifier for the asset
   * @returns The loaded HTMLImageElement, or undefined if not loaded
   */
  static getImage(key: string): HTMLImageElement {
    if (!this.loadedAssets.has(key)) throw new Error(`Image asset ${key} not loaded`);
    return this.loadedAssets.get(key)!;
  }

  /**
   * Checks if a specific asset has been loaded.
   * @param key - Unique identifier for the asset
   * @returns True if the asset is loaded and available
   */
  static isLoaded(key: string): boolean {
    return this.loadedAssets.has(key);
  }

  /**
   * Returns a promise that resolves when all registered assets have finished loading.
   * @returns Promise that resolves when all assets are loaded
   */
  static async areAllAssetsLoaded(): Promise<void> {
    if (this.registeredAssets.size === 0) {
      return;
    }

    const allPromises = Array.from(this.registeredAssets).map(async (key) => {
      if (this.loadedAssets.has(key)) {
        return;
      }
      if (this.loadingPromises.has(key)) {
        await this.loadingPromises.get(key)!;
        return;
      }
    });

    await Promise.all(allPromises);
  }
}
