import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
	plugins: [react()],
	root: 'admin',
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'admin/src'),
		},
	},
	build: {
		outDir: path.resolve(__dirname, 'assets/dist'),
		emptyOutDir: true,
		rollupOptions: {
			input: path.resolve(__dirname, 'admin/src/main.tsx'),
			output: {
				entryFileNames: 'iris-admin.js',
				chunkFileNames: 'iris-[name].js',
				assetFileNames: 'iris-admin[extname]',
			},
		},
	},
});
