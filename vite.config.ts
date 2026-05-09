import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/supabase-api': {
        target: 'https://bwtgavgdwihqdlbpystw.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-api/, ''),
      },
      '/ocr-api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ocr-api/, ''),
      },
      '/arcee-api': {
        target: 'https://models.arcee.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/arcee-api/, ''),
      },
    },
  },
  plugins: [react()].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui':      ['framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          'vendor-charts':  ['recharts'],
          'vendor-supabase':['@supabase/supabase-js'],
          'vendor-query':   ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));

