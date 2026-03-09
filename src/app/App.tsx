import { useEffect } from 'react';
import { HashRouter, useLocation, useNavigate } from 'react-router';
import { ThermomixCooker } from './components/ThermomixCooker';
import { AuthScreen } from './components/screens/AuthScreen';
import { useAuthSession } from './hooks/useAuthSession';

function AppShell() {
  const auth = useAuthSession();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthRoute = location.pathname === '/auth';

  useEffect(() => {
    if (!auth.isReady) return;

    if (!auth.isAuthenticated && !isAuthRoute) {
      navigate('/auth', { replace: true });
      return;
    }

    if (auth.isAuthenticated && isAuthRoute) {
      navigate('/', { replace: true });
    }
  }, [auth.isAuthenticated, auth.isReady, isAuthRoute, navigate]);

  if (!auth.isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm">Validando sesión...</div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <AuthScreen
        error={auth.error}
        isConfigured={auth.isSupabaseEnabled}
        onSignIn={async (email, password) => {
          await auth.signIn(email, password);
        }}
        onSignUp={async (email, password) => {
          const result = await auth.signUp(email, password);
          return {
            requiresEmailConfirmation: !result.session,
          };
        }}
      />
    );
  }

  return <ThermomixCooker auth={auth} />;
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
