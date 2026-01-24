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
  private static assets: Map<string, Asset<unknown>> = new Map();

  /**
   * Loads an image asset asynchronously.
   * @param key - Unique identifier for the asset
   * @param path - Path to the image file (can be Vite-imported URL or public path)
   * @returns Promise that resolves to the loaded unknown
   */
  static async loadImage(key: string, path: string) {
    if (this.assets.has(key)) return;
    const assetObject = createAssetShell<HTMLImageElement>();
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        assetObject.value = img;
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });
    assetObject.promise = promise;
    assetObject.promise.then(v => {
      assetObject.value = v;
      assetObject.isLoaded = true;
      assetObject.isLoading = false;
    });
    this.assets.set(key, assetObject);
  }

  static getAsset<T>(key: string): Readonly<Asset<T>> {
    if (!this.assets.has(key)) {
      this.assets.set(key, createAssetShell<T>());
    }
    return this.assets.get(key) as Asset<T>;
  }

  /**
   * Returns a promise that resolves when all registered assets have finished loading.
   * @returns Promise that resolves when all assets are loaded
   */
  static async areAllAssetsLoaded(): Promise<void> {
    const allPromises = Array.from(this.assets).map(async ([, asset]) => asset.promise);
    await Promise.all(allPromises);
  }
}
const createAssetShell = <T>(): Asset<T> => ({
  value: null as T,
  isLoaded: false,
  isLoading: true,
  promise: null as unknown as Promise<T>,
})
export type Asset<T> = {
  value: T;
  isLoaded: boolean;
  isLoading: boolean;
  promise: Promise<T>;
}