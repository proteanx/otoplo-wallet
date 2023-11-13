/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
    readonly VITE_VERSION: string;
    readonly VITE_IS_DESKTOP: string;
}