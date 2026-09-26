interface ImportMetaEnv {
  /** Base address of the Storage API, without a trailing slash. */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
