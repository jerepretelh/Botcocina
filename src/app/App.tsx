import { useEffect } from 'react';
import { HashRouter, useLocation, useNavigate } from 'react-router';
import { AUTH_REDIRECT_PATH_KEY, resolveAppAuthRouteDecision } from './appAuthRouting';
import { AuthScreen } from './components/screens/AuthScreen';
import { FixedRuntimeApp } from './features/fixed-runtime/FixedRuntimeApp';
import { useAuthSession } from './hooks/useAuthSession';

type AuthRedirectState = {
  redirectTo?: string;
};

function AppShell() {
  const auth = useAuthSession();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthRoute = location.pathname === '/auth';
  const redirectState = (location.state as AuthRedirectState | null) ?? null;
  const isRuntimeRoute = location.pathname === '/runtime-fijo' || location.pathname.startsWith('/runtime-fijo/');
  const shouldRenderAuthScreen = !auth.isAuthenticated || auth.authFlow === 'password_recovery';

  useEffect(() => {
    const pendingRedirectPath = window.sessionStorage.getItem(AUTH_REDIRECT_PATH_KEY);
    const decision = resolveAppAuthRouteDecision({
      isReady: auth.isReady,
      isAuthenticated: auth.isAuthenticated,
      isAuthRoute,
      isRuntimeRoute,
      isPasswordRecoveryFlow: auth.authFlow === 'password_recovery',
      locationPathname: location.pathname,
      pendingRedirectPath,
      redirectStatePath: redirectState?.redirectTo ?? null,
    });

    if (decision.kind === 'store_redirect') {
      window.sessionStorage.setItem(AUTH_REDIRECT_PATH_KEY, decision.path);
      navigate('/auth', {
        replace: true,
        state: { redirectTo: decision.path },
      });
      return;
    }

    if (decision.kind === 'redirect') {
      navigate(decision.to, { replace: true });
      return;
    }

    if (decision.kind === 'clear_redirect') {
      window.sessionStorage.removeItem(AUTH_REDIRECT_PATH_KEY);
    }
  }, [auth.authFlow, auth.isAuthenticated, auth.isReady, isAuthRoute, isRuntimeRoute, location.pathname, navigate, redirectState?.redirectTo]);

  if (!auth.isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm">Validando sesión...</div>
      </div>
    );
  }

  if (shouldRenderAuthScreen) {
    return (
      <AuthScreen
        error={auth.error}
        isConfigured={auth.isSupabaseEnabled}
        isPasswordRecovery={auth.authFlow === 'password_recovery'}
        onSignIn={async (email, password) => {
          await auth.signIn(email, password);
        }}
        onSignUp={async (email, password) => {
          const result = await auth.signUp(email, password);
          return {
            requiresEmailConfirmation: !result.session,
          };
        }}
        onRequestPasswordReset={async (email) => {
          await auth.requestPasswordReset(email);
        }}
        onUpdatePassword={async (password) => {
          await auth.updatePassword(password);
        }}
        onRetry={() => {
          void auth.retry();
        }}
      />
    );
  }

  if (isRuntimeRoute) {
    return <FixedRuntimeApp pathname={location.pathname} navigate={navigate} userId={auth.userId} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5efe8] text-[#6f5d4b]">
      <div className="rounded-2xl border border-[#e8dbcc] bg-white px-5 py-3 text-sm shadow-sm">
        Redirigiendo a runtime-fijo...
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
