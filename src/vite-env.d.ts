/// <reference types="vite/client" />

declare module 'virtual:pwa-register' {
  export function registerSW(options?: any): (reloadPage?: boolean) => Promise<void>;
}
