export const AUTH_REDIRECT_PATH_KEY = 'auth:redirect:path';

export type AppAuthRouteDecision =
  | { kind: 'redirect'; to: string }
  | { kind: 'store_redirect'; path: string }
  | { kind: 'clear_redirect' }
  | { kind: 'none' };

type ResolveAuthRouteDecisionInput = {
  isReady: boolean;
  isAuthenticated: boolean;
  isAuthRoute: boolean;
  isRuntimeRoute: boolean;
  isPasswordRecoveryFlow: boolean;
  locationPathname: string;
  pendingRedirectPath: string | null;
  redirectStatePath?: string | null;
};

export function resolveAppAuthRouteDecision(input: ResolveAuthRouteDecisionInput): AppAuthRouteDecision {
  if (!input.isReady) return { kind: 'none' };

  if (!input.isAuthenticated && !input.isAuthRoute) {
    return { kind: 'store_redirect', path: input.locationPathname };
  }

  if (input.isAuthenticated && input.isAuthRoute && !input.isPasswordRecoveryFlow) {
    const nextPath = input.pendingRedirectPath && input.pendingRedirectPath !== '/'
      ? input.pendingRedirectPath
      : input.redirectStatePath && input.redirectStatePath !== '/'
        ? input.redirectStatePath
        : '/runtime-fijo';
    return { kind: 'redirect', to: nextPath };
  }

  if (input.isAuthenticated && input.pendingRedirectPath && input.pendingRedirectPath !== '/' && input.locationPathname === '/') {
    return { kind: 'redirect', to: input.pendingRedirectPath };
  }

  if (input.isAuthenticated && input.locationPathname === '/' && !input.isRuntimeRoute) {
    return { kind: 'redirect', to: '/runtime-fijo' };
  }

  if (input.isAuthenticated && input.pendingRedirectPath === input.locationPathname) {
    return { kind: 'clear_redirect' };
  }

  return { kind: 'none' };
}
