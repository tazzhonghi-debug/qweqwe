import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
      // Merges built CSS and JS into a single standalone HTML file (dist/index.html & luckydraw.html)
      {
        name: 'merge-singlefile-html',
        apply: 'build' as const,
        closeBundle(error?: Error): void {
          if (error) return;
          const distDir = path.resolve(__dirname, 'dist');
          const htmlPath = path.join(distDir, 'index.html');
          if (!fs.existsSync(htmlPath)) return;

          let html = fs.readFileSync(htmlPath, 'utf-8');

          // Inline stylesheets
          html = html.replace(
            /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
            (match, href) => {
              const relPath = href.replace(/^\//, '');
              const cssPath = path.join(distDir, relPath);
              if (fs.existsSync(cssPath)) {
                const css = fs.readFileSync(cssPath, 'utf-8');
                return `<style>${css}</style>`;
              }
              return match;
            }
          );

          // Extract and inline scripts right before </body>
          const inlineScripts: string[] = [];
          html = html.replace(
            /<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
            (match, src) => {
              const relPath = src.replace(/^\//, '');
              const jsPath = path.join(distDir, relPath);
              if (fs.existsSync(jsPath)) {
                const js = fs
                  .readFileSync(jsPath, 'utf-8')
                  .replace(/<\/script>/gi, '<\\/script>');
                inlineScripts.push(`<script>${js}</script>`);
                return '';
              }
              return match;
            }
          );

          if (inlineScripts.length > 0) {
            html = html.replace('</body>', `${inlineScripts.join('\n')}\n</body>`);
          }

          fs.writeFileSync(htmlPath, html, 'utf-8');

          // Also emit standalone luckydraw.html in project root and public/ for direct download
          fs.writeFileSync(path.resolve(__dirname, 'luckydraw.html'), html, 'utf-8');
          const publicDir = path.resolve(__dirname, 'public');
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, {recursive: true});
          }
          fs.writeFileSync(path.join(publicDir, 'luckydraw.html'), html, 'utf-8');

          // Clean up split asset files inside dist/assets
          const distAssetsDir = path.join(distDir, 'assets');
          if (fs.existsSync(distAssetsDir)) {
            fs.rmSync(distAssetsDir, {recursive: true, force: true});
          }
        },
      },
    ],
    build: {
      cssCodeSplit: false,
      assetsInlineLimit: 100000000,
      rollupOptions: {
        output: {
          format: 'iife' as const,
          inlineDynamicImports: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
