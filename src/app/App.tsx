import { useEffect } from 'react';
import { HashRouter, useLocation, useNavigate } from 'react-router';
import { ThermomixCooker } from './components/ThermomixCooker';
import { AuthScreen } from './components/screens/AuthScreen';
import { useAuthSession } from './hooks/useAuthSession';

type AuthRedirectState = {
  redirectTo?: string;
};

const AUTH_REDIRECT_PATH_KEY = 'auth:redirect:path';

function AppShell() {
  const auth = useAuthSession();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthRoute = location.pathname === '/auth';
  const redirectState = (location.state as AuthRedirectState | null) ?? null;

  useEffect(() => {
    if (!auth.isReady) return;
    const pendingRedirectPath = window.sessionStorage.getItem(AUTH_REDIRECT_PATH_KEY);

    if (!auth.isAuthenticated && !isAuthRoute) {
      window.sessionStorage.setItem(AUTH_REDIRECT_PATH_KEY, location.pathname);
      navigate('/auth', {
        replace: true,
        state: { redirectTo: location.pathname },
      });
      return;
    }

    if (auth.isAuthenticated && isAuthRoute) {
      const nextPath = pendingRedirectPath || redirectState?.redirectTo || '/';
      navigate(nextPath, { replace: true });
      return;
    }

    if (auth.isAuthenticated && pendingRedirectPath && location.pathname === '/') {
      navigate(pendingRedirectPath, { replace: true });
      return;
    }

    if (auth.isAuthenticated && pendingRedirectPath === location.pathname) {
      window.sessionStorage.removeItem(AUTH_REDIRECT_PATH_KEY);
    }
  }, [auth.isAuthenticated, auth.isReady, isAuthRoute, location.pathname, navigate, redirectState?.redirectTo]);

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
