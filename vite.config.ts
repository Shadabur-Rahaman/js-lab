import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ base: './', plugins: [react(), tailwindcss()], build: {rollupOptions:{output:{manualChunks:{'react-vendor':['react','react-dom'],'motion-vendor':['motion/react'],'editor-vendor':['prismjs','react-simple-code-editor']}}}} });
