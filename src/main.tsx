import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './lib/auth';

class InitErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fc', padding: '24px' }}>
          <div style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', margin: '0 auto', borderRadius: '14px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>!</div>
            <h1 style={{ marginTop: '16px', fontSize: '20px', fontWeight: 800, color: '#0f172a', fontFamily: 'system-ui' }}>Erreur de configuration</h1>
            <p style={{ marginTop: '8px', fontSize: '14px', lineHeight: 1.6, color: '#64748b', fontFamily: 'system-ui' }}>
              L'application n'a pas pu démarrer. {this.state.error.message}
            </p>
            <p style={{ marginTop: '16px', fontSize: '13px', color: '#94a3b8', fontFamily: 'system-ui' }}>
              Si vous êtes sur Vercel, vérifiez que les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont configurées et redéployez.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InitErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </InitErrorBoundary>
  </StrictMode>,
);
