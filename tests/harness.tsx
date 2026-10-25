/**
 * Test harness: renders real components in jsdom so the Excel import flow can be
 * verified without a browser. Bundled by tests/build-harness.mjs.
 */
import { createRoot } from 'react-dom/client';
import { DirectionHub } from '../src/components/DirectionHub';

export function mountDirectionHub(props: Record<string, unknown>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(<DirectionHub {...(props as any)} />);
  return {
    container,
    unmount: () => {
      root.unmount();
      container.remove();
    },
  };
}

export { DirectionHub };
export * as studentImport from '../src/lib/studentImport';
export * as importSession from '../src/lib/importSession';
