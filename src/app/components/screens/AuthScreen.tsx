import { useMemo, useState } from 'react';
import { ChefHat, LoaderCircle, LogIn, UserPlus } from 'lucide-react';
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
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AuthScreen({ error, isConfigured, onSignIn, onSignUp }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mergedError = error ?? localError;
  const activeCopy = useMemo(
    () =>
      activeTab === 'signin'
        ? {
            title: 'Inicia sesión',
            description: 'Accede a tus listas, progreso y recetas guardadas.',
            submit: 'Entrar',
            icon: LogIn,
          }
        : {
            title: 'Crea tu cuenta',
            description: 'Regístrate con correo y contraseña para comenzar.',
            submit: 'Crear cuenta',
            icon: UserPlus,
          },
    [activeTab],
  );

  const validate = (email: string, password: string) => {
    if (!isValidEmail(email)) {
      setLocalError('Ingresa un correo válido.');
      return false;
    }
    if (!password.trim()) {
      setLocalError('La contraseña es obligatoria.');
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    setSuccessMessage(null);
    if (!validate(signInEmail, signInPassword)) return;
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await onSignIn(signInEmail.trim(), signInPassword);
    } catch {
      // Error handled by hook.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    setSuccessMessage(null);
    if (!validate(signUpEmail, signUpPassword)) return;
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
      // Error handled by hook.
    } finally {
      setIsSubmitting(false);
    }
  };

  const ActiveIcon = activeCopy.icon;

  return (
    <ProductPage>
      <ProductContainer className="flex min-h-[calc(100vh-2rem)] items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-center space-y-6 rounded-[2rem] border border-primary/10 bg-card/85 p-8 shadow-xl backdrop-blur md:p-10">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/12 ring-1 ring-primary/20">
              <ChefHat className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/80">Chef Bot Pro</p>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-5xl">
                Cocina con progreso guardado y recetas ligadas a tu cuenta.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 md:text-lg">
                Esta versión requiere autenticación para proteger listas, progreso de cocción y recetas generadas con IA.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-slate-700 dark:text-slate-200 md:grid-cols-3">
              <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">Listas privadas sincronizadas por usuario.</div>
              <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">Reanudación del progreso exacto de cada receta.</div>
              <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">Historial y recetas IA ligados a tu sesión.</div>
            </div>
          </section>

          <ProductSurface className="p-0">
          <Card className="border-0 bg-transparent text-foreground shadow-none">
            <CardHeader className="space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/10">
                <ActiveIcon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-2xl text-slate-900 dark:text-white">{activeCopy.title}</CardTitle>
              <CardDescription>{activeCopy.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!isConfigured && (
                <Alert variant="destructive">
                  <AlertTitle>Configuración incompleta</AlertTitle>
                  <AlertDescription>Define las variables de Supabase para habilitar el acceso con correo.</AlertDescription>
                </Alert>
              )}

              {mergedError && (
                <Alert variant="destructive">
                  <AlertTitle>No se pudo completar la acción</AlertTitle>
                  <AlertDescription>{mergedError}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert>
                  <AlertTitle>Estado de la cuenta</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')} className="gap-4">
                <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-primary/6 p-1">
                  <TabsTrigger value="signin" className="rounded-xl py-2">Iniciar sesión</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-xl py-2">Crear cuenta</TabsTrigger>
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
                      placeholder="Ingresa tu contraseña"
                      value={signInPassword}
                      onChange={(event) => setSignInPassword(event.target.value)}
                      className="placeholder:text-slate-400"
                    />
                  </div>
                  <Button
                    type="button"
                    className="h-11 w-full rounded-2xl"
                    disabled={isSubmitting || !isConfigured}
                    onClick={() => void handleSignIn()}
                  >
                    {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    Entrar
                  </Button>
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
                      placeholder="Crea una contraseña"
                      value={signUpPassword}
                      onChange={(event) => setSignUpPassword(event.target.value)}
                      className="placeholder:text-slate-400"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-2xl"
                    disabled={isSubmitting || !isConfigured}
                    onClick={() => void handleSignUp()}
                  >
                    {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Crear cuenta
                  </Button>
                </TabsContent>
              </Tabs>

              <p className="text-center text-sm text-slate-500">
                Recuperación de contraseña y acceso por usuario quedan preparados para una siguiente iteración.
              </p>
            </CardContent>
          </Card>
          </ProductSurface>
        </div>
      </ProductContainer>
    </ProductPage>
  );
}
