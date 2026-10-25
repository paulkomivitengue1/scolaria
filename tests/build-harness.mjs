/**
 * Bundles tests/harness.tsx into tests/.build/harness.mjs for the jsdom test run.
 * `@supabase/supabase-js` is replaced by a stub: the import feature must be
 * testable without a live backend or credentials.
 */
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const supabaseStub = {
  name: 'stub-supabase',
  setup(build) {
    build.onResolve({ filter: /lib\/supabase$/ }, async (args) => {
      if (args.importer.startsWith(root)) {
        return { path: 'supabase-stub', namespace: 'stub' };
      }
      return null;
    });
    build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: `
        const chain = {
          select() { return chain; },
          eq() { return chain; },
          neq() { return chain; },
          order() { return chain; },
          limit() { return chain; },
          insert() { return chain; },
          update() { return chain; },
          delete() { return chain; },
          in() { return chain; },
          single() { return Promise.resolve({ data: null, error: null }); },
          maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
        };
        export function getSupabase() {
          return { from() { return chain; }, rpc() { return chain; } };
        }
      `,
      loader: 'js',
    }));
  },
};

await build({
  entryPoints: [path.join(here, 'harness.tsx')],
  outfile: path.join(here, '.build', 'harness.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  external: ['xlsx'],
  define: {
    'import.meta.env.PROD': 'true',
    'import.meta.env.DEV': 'false',
    'import.meta.env.MODE': '"test"',
    'process.env.NODE_ENV': '"production"',
  },
  plugins: [supabaseStub],
  logLevel: 'warning',
});

console.log('harness bundled');
