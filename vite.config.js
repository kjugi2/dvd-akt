import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/dvd-akt/',   // ⬅️ ime tvog GitHub repo-a
  plugins: [react()],
})
