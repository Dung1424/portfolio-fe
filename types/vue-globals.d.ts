export {}

declare module 'vue' {
  interface ComponentCustomProperties {
    /** Origin API (không dùng $ — tránh xung đột với provide $apiOrigin) */
    apiOrigin: string
  }
}
