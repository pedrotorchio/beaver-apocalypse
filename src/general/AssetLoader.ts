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
  private static loadingPromises: Map<string, Promise<unknown>> = new Map();
  private static registeredAssets: Set<string> = new Set();
  private static loadedAssets: Map<string, unknown> = new Map();

  /**
   * Loads an image asset asynchronously.
   * @param key - Unique identifier for the asset
   * @param path - Path to the image file (can be Vite-imported URL or public path)
   * @returns Promise that resolves to the loaded unknown
   */
  static async loadImage(key: string, path: string) {
    this.registeredAssets.add(key);
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedAssets.set(key, img);
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });

    this.loadingPromises.set(key, promise);
  }

  static getAsset<T>(key: string) {
    if (!this.loadingPromises.has(key)) throw new Error(`Asset ${key} not loaded`);
    const promise = this.loadingPromises.get(key)!;
    const valueWrapper = { 
      value: null as T, 
      isLoaded: false, 
      isLoading: true,
      promise: promise,
    };
    promise.then(v => Object.assign(valueWrapper, {
      value: v as T,
      isLoaded: true,
      isLoading: false,
    }));
    return new Proxy(valueWrapper, {
      get(target: Asset<T>, prop: keyof Asset<T>) {
        return target[prop];
      }
    }) as  Readonly<Asset<T>>;
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
export type Asset<T> = {
  readonly value: T;
  readonly isLoaded: boolean;
  readonly isLoading: boolean;
  readonly promise: Promise<T>;
}