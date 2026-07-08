import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'resources/ts'),
		},
	},
	build: {
		outDir: path.resolve(__dirname, 'assets/dist'),
		emptyOutDir: true,
		rollupOptions: {
			input: path.resolve(__dirname, 'resources/ts/main.tsx'),
			output: {
				entryFileNames: 'vitrus-admin.js',
				chunkFileNames: 'vitrus-[name].js',
				assetFileNames: (assetInfo) => {
					if (assetInfo.name && assetInfo.name.endsWith('.css')) {
						return 'vitrus-admin[extname]';
					}
					return '[name][extname]';
				},
			},
		},
	},
});
