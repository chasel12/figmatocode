declare module 'pixelmatch' {
  interface PixelmatchOptions {
    threshold?: number;
    includeAA?: boolean;
    alpha?: number;
    diffColor?: [number, number, number];
    aaColor?: [number, number, number];
  }
  function pixelmatch(
    img1: Uint8Array | Uint8ClampedArray,
    img2: Uint8Array | Uint8ClampedArray,
    output: Uint8Array | Uint8ClampedArray,
    width: number,
    height: number,
    options?: PixelmatchOptions,
  ): number;
  export default pixelmatch;
}
