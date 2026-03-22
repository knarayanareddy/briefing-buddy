/// <reference types="vite/client" />

declare module "*.asset.json" {
  const value: { url: string };
  export default value;
}
