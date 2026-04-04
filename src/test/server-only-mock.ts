// Mock for 'server-only' in Vitest. The real package throws at runtime if
// imported in a browser/client bundle; in tests we just want a no-op.
export {};
