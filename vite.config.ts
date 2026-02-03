import { defineConfig } from 'vite';
import path from 'path';

// Use async config + dynamic import for ESM-only plugins to avoid CJS/require issues in some environments
export default defineConfig(async () => {
  const { default: react } = await import('@vitejs/plugin-react');
  const base = process.env.VITE_BASE || '/';

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        // Ensure all imports resolve to the same React to avoid duplicate/react-internal-name issues
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        // Force single copies of MUI / emotion packages to avoid duplicate internal React imports
        '@mui/material': path.resolve(__dirname, 'node_modules/@mui/material'),
        '@mui/system': path.resolve(__dirname, 'node_modules/@mui/system'),
        '@mui/utils': path.resolve(__dirname, 'node_modules/@mui/utils'),
        '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
        '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled')
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@mui/material',
        '@mui/system',
        '@mui/utils',
        '@emotion/react',
        '@emotion/styled'
      ]
    },
    server: {
      fs: {
        allow: [path.resolve(__dirname)]
      }
    }
  };
});
