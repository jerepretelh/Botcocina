import { useEffect, useMemo, useState } from 'react';
import {
  ChefHat,
  KeyRound,
  LoaderCircle,
  LogIn,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ProductContainer, ProductPage, ProductSurface } from '../ui/product-system';

interface AuthScreenProps {
  error: string | null;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onUpdatePassword: (password: string) => Promise<void>;
  onRetry: () => void;
}

type AuthTab = 'signin' | 'signup' | 'recover';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePassword(value: string): boolean {
  return value.trim().length >= 8;
}

export function AuthScreen({
  error,
  isConfigured,
  isPasswordRecovery,
  onSignIn,
  onSignUp,
  onRequestPasswordReset,
  onUpdatePassword,
  onRetry,
}: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(isPasswordRecovery ? 'recover' : 'signin');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isPasswordRecovery) {
      setActiveTab('recover');
      setLocalError(null);
      setSuccessMessage('Elige una nueva contraseña para completar la recuperación.');
    }
  }, [isPasswordRecovery]);

  const mergedError = error ?? localError;
  const activeCopy = useMemo(() => {
    if (activeTab === 'signup') {
      return {
        title: 'Crea tu cuenta',
        description: 'Guarda progreso, favoritos y recetas IA en un espacio personal.',
        submit: 'Crear cuenta',
        icon: UserPlus,
      };
    }
    if (activeTab === 'recover') {
      return isPasswordRecovery
        ? {
            title: 'Actualiza tu contraseña',
            description: 'Estás dentro del flujo de recuperación. Elige una contraseña nueva y segura.',
            submit: 'Guardar contraseña',
            icon: KeyRound,
          }
        : {
            title: 'Recupera tu acceso',
            description: 'Te enviaremos un enlace seguro para volver a entrar a tu cuenta.',
            submit: 'Enviar enlace',
            icon: Mail,
          };
    }
    return {
      title: 'Inicia sesión',
      description: 'Accede a tus listas, progreso guardado y biblioteca personal.',
      submit: 'Entrar',
      icon: LogIn,
    };
  }, [activeTab, isPasswordRecovery]);

  const validateEmailPassword = (email: string, password: string) => {
    if (!isValidEmail(email)) {
      setLocalError('Ingresa un correo válido.');
      return false;
    }
    if (!validatePassword(password)) {
      setLocalError('Usa una contraseña de al menos 8 caracteres.');
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    setSuccessMessage(null);
    if (!validateEmailPassword(signInEmail, signInPassword)) return;
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await onSignIn(signInEmail.trim(), signInPassword);
    } catch {
      // El hook ya maneja el error central.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    setSuccessMessage(null);
    if (!validateEmailPassword(signUpEmail, signUpPassword)) return;
    setLocalError(null);
    setIsSubmitting(true);
    try {
      const result = await onSignUp(signUpEmail.trim(), signUpPassword);
      setSuccessMessage(
        result.requiresEmailConfirmation
          ? 'Cuenta creada. Revisa tu correo para confirmar el acceso.'
          : 'Cuenta creada correctamente. Ya puedes ingresar.',
      );
      setActiveTab('signin');
      setSignInEmail(signUpEmail.trim());
      setSignInPassword('');
      setSignUpPassword('');
    } catch {
      // El hook ya maneja el error central.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    setSuccessMessage(null);
    if (!isValidEmail(recoveryEmail)) {
      setLocalError('Ingresa un correo válido para recuperar tu acceso.');
      return;
    }
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await onRequestPasswordReset(recoveryEmail.trim());
      setSuccessMessage('Te enviamos un enlace de recuperación. Revisa tu correo y vuelve aquí desde ese enlace.');
    } catch {
      // El hook ya maneja el error central.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async () => {
    setSuccessMessage(null);
    if (!validatePassword(resetPassword)) {
      setLocalError('Usa una contraseña nueva de al menos 8 caracteres.');
      return;
    }
    if (resetPassword !== confirmResetPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await onUpdatePassword(resetPassword);
      setResetPassword('');
      setConfirmResetPassword('');
      setSuccessMessage('Tu contraseña se actualizó. Inicia sesión con la nueva clave.');
      setActiveTab('signin');
    } catch {
      // El hook ya maneja el error central.
    } finally {
      setIsSubmitting(false);
    }
  };

  const ActiveIcon = activeCopy.icon;
  const isBlocked = !isConfigured;
  const showRetry = Boolean(error);

  return (
    <ProductPage>
      <ProductContainer className="flex min-h-[100dvh] items-center justify-center py-6">
        <div className="grid w-full gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
          <section className="order-2 flex flex-col gap-4 lg:order-1 lg:justify-center">
            <ProductSurface className="overflow-hidden border-primary/15 bg-card/90 p-6 sm:p-8 md:p-10">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-primary/12 ring-1 ring-primary/20">
                <ChefHat className="h-7 w-7 text-primary" />
              </div>
              <div className="mt-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">Chef Bot Pro</p>
                <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl">
                  Tu cocina, tus listas y tu progreso viven en una sola cuenta.
                </h1>
                <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                  Inicia sesión para recuperar recetas guardadas, continuar exactamente donde te quedaste y mantener tu biblioteca IA ligada a tu usuario.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-primary/10 bg-background/80 p-4">
                  <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Progreso seguro</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Retoma timers, pasos y recetas sin perder contexto.</p>
                </div>
                <div className="rounded-3xl border border-primary/10 bg-background/80 p-4">
                  <Sparkles className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Recetas IA propias</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Todo lo que generas queda ligado a tu sesión.</p>
                </div>
                <div className="rounded-3xl border border-primary/10 bg-background/80 p-4">
                  <Mail className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Acceso por email</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Un flujo simple y estable para salir a producción.</p>
                </div>
              </div>
            </ProductSurface>
          </section>

          <section className="order-1 lg:order-2">
            <ProductSurface className="p-0">
              <Card className="border-0 bg-transparent text-foreground shadow-none">
                <CardHeader className="space-y-3 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/10">
                    <ActiveIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-2xl text-slate-900 dark:text-white">{activeCopy.title}</CardTitle>
                    <CardDescription className="text-sm leading-6">{activeCopy.description}</CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                  {!isConfigured ? (
                    <Alert variant="destructive" className="border-red-200/80 bg-red-50/90">
                      <AlertTitle>Configuración incompleta</AlertTitle>
                      <AlertDescription className="space-y-3">
                        <p>Supabase debe estar configurado para habilitar autenticación real en este entorno.</p>
                        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                          <RefreshCw className="h-4 w-4" />
                          Reintentar
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {mergedError ? (
                    <Alert variant="destructive">
                      <AlertTitle>No se pudo completar la acción</AlertTitle>
                      <AlertDescription className="space-y-3">
                        <p>{mergedError}</p>
                        {showRetry ? (
                          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                            <RefreshCw className="h-4 w-4" />
                            Reintentar
                          </Button>
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {successMessage ? (
                    <Alert className="border-emerald-200 bg-emerald-50/90 text-emerald-950">
                      <AlertTitle>Listo</AlertTitle>
                      <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  <Tabs value={activeTab} onValueChange={(value) => {
                    setActiveTab(value as AuthTab);
                    setLocalError(null);
                    setSuccessMessage(null);
                  }} className="gap-4">
                    <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-primary/6 p-1">
                      <TabsTrigger value="signin" className="rounded-xl py-2">Entrar</TabsTrigger>
                      <TabsTrigger value="signup" className="rounded-xl py-2">Cuenta</TabsTrigger>
                      <TabsTrigger value="recover" className="rounded-xl py-2">Recuperar</TabsTrigger>
                    </TabsList>

                    <TabsContent value="signin" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Correo</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          autoComplete="email"
                          placeholder="tu@correo.com"
                          value={signInEmail}
                          onChange={(event) => setSignInEmail(event.target.value)}
                          className="placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Contraseña</Label>
                        <Input
                          id="signin-password"
                          type="password"
                          autoComplete="current-password"
                          placeholder="Tu contraseña"
                          value={signInPassword}
                          onChange={(event) => setSignInPassword(event.target.value)}
                          className="placeholder:text-slate-400"
                        />
                      </div>
                      <Button
                        type="button"
                        className="h-11 w-full rounded-2xl"
                        disabled={isSubmitting || isBlocked}
                        onClick={() => void handleSignIn()}
                      >
                        {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                        Entrar a mi cuenta
                      </Button>
                      <button
                        type="button"
                        className="w-full text-sm font-medium text-primary transition hover:opacity-80"
                        onClick={() => {
                          setActiveTab('recover');
                          setSuccessMessage(null);
                          setLocalError(null);
                          setRecoveryEmail(signInEmail);
                        }}
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Correo</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          autoComplete="email"
                          placeholder="tu@correo.com"
                          value={signUpEmail}
                          onChange={(event) => setSignUpEmail(event.target.value)}
                          className="placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Contraseña</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Al menos 8 caracteres"
                          value={signUpPassword}
                          onChange={(event) => setSignUpPassword(event.target.value)}
                          className="placeholder:text-slate-400"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full rounded-2xl"
                        disabled={isSubmitting || isBlocked}
                        onClick={() => void handleSignUp()}
                      >
                        {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        Crear cuenta
                      </Button>
                    </TabsContent>

                    <TabsContent value="recover" className="space-y-4">
                      {isPasswordRecovery ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="reset-password">Nueva contraseña</Label>
                            <Input
                              id="reset-password"
                              type="password"
                              autoComplete="new-password"
                              placeholder="Al menos 8 caracteres"
                              value={resetPassword}
                              onChange={(event) => setResetPassword(event.target.value)}
                              className="placeholder:text-slate-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reset-password-confirm">Confirma tu contraseña</Label>
                            <Input
                              id="reset-password-confirm"
                              type="password"
                              autoComplete="new-password"
                              placeholder="Repite la nueva contraseña"
                              value={confirmResetPassword}
                              onChange={(event) => setConfirmResetPassword(event.target.value)}
                              className="placeholder:text-slate-400"
                            />
                          </div>
                          <Button
                            type="button"
                            className="h-11 w-full rounded-2xl"
                            disabled={isSubmitting || isBlocked}
                            onClick={() => void handleUpdatePassword()}
                          >
                            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                            Guardar nueva contraseña
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="recovery-email">Correo</Label>
                            <Input
                              id="recovery-email"
                              type="email"
                              autoComplete="email"
                              placeholder="tu@correo.com"
                              value={recoveryEmail}
                              onChange={(event) => setRecoveryEmail(event.target.value)}
                              className="placeholder:text-slate-400"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 w-full rounded-2xl"
                            disabled={isSubmitting || isBlocked}
                            onClick={() => void handleRequestPasswordReset()}
                          >
                            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            Enviar enlace de recuperación
                          </Button>
                        </>
                      )}
                    </TabsContent>
                  </Tabs>

                  <div className="rounded-2xl border border-primary/10 bg-primary/[0.04] px-4 py-3 text-sm leading-6 text-slate-600">
                    Ingresar te permite sincronizar favoritos, listas y el progreso exacto de cocción en todos tus intentos.
                  </div>
                </CardContent>
              </Card>
            </ProductSurface>
          </section>
        </div>
      </ProductContainer>
    </ProductPage>
  );
}
