
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    esbuild: {
        jsx: 'automatic',
    },

    build: {
        minify: false,
        outDir: 'cli',
        target: 'node18',
        rollupOptions: {
            input: "./src/index.ts",
            external: ['typescript', 'voby', 'test', 'web', './index.html'],
        },
        ssr: true,
        lib: {
            entry: "./src/index.ts",
            fileName: 'index',
            formats: ['es'],
        },
        sourcemap: true,
    },
    resolve: {
        alias: {
            '~': path.resolve(__dirname, 'src'),
        },
    },
})


