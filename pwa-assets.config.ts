import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PNG icons in public/icons from kasica.svg: `npx pwa-assets-generator`.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#1f8a70' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#1f8a70' } },
  },
  images: ['public/icons/kasica.svg'],
})
