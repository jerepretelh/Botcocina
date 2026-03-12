import { useEffect, useMemo, useState } from 'react';
import { KeyRound, LoaderCircle, Rocket, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import type { AIProviderSettings, AIUsageSnapshot } from '../../../types';
import { deleteStoredGoogleKey, fetchAISettings, updateAISettings, validateStoredOrNewGoogleKey } from '../../lib/aiSettings';
import { appBuildMetadata, formatVersionLabel, getEnvironmentLabel } from '../../lib/appMetadata';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Separator } from '../ui/separator';
import { MainShellLayout } from './MainShellLayout';
import { ProductContainer, ProductHeader, ProductPage } from '../ui/product-system';

interface AISettingsScreenProps {
  currentUserEmail: string | null;
  onGoHome: () => void;
  onGoMyRecipes: () => void;
  onGoFavorites: () => void;
  onGoWeeklyPlan: () => void;
  onGoShoppingList: () => void;
  onGoSettings: () => void;
  onOpenReleases: () => void;
  onSignOut: () => void;
}

type SettingsFormState = {
  authMode: AIProviderSettings['authMode'];
  googleModel: string;
  tokenBudgetMode: AIProviderSettings['tokenBudgetMode'];
  monthlyTokenLimit: string;
  budgetAmount: string;
  apiKeyInput: string;
};

const initialForm: SettingsFormState = {
  authMode: 'platform_key',
  googleModel: 'gemini-2.5-flash',
  tokenBudgetMode: 'none',
  monthlyTokenLimit: '',
  budgetAmount: '',
  apiKeyInput: '',
};

const fallbackSettings: AIProviderSettings = {
  provider: 'google_gemini',
  authMode: 'platform_key',
  googleModel: 'gemini-2.5-flash',
  tokenBudgetMode: 'none',
  monthlyTokenLimit: null,
  budgetAmount: null,
  isKeyConfigured: false,
  keyLast4: null,
  lastKeyCheckAt: null,
  lastKeyCheckStatus: 'unknown',
};

const fallbackUsage: AIUsageSnapshot = {
  provider: 'google_gemini',
  model: 'gemini-2.5-flash',
  budgetMode: 'none',
  currentMonthTokens: 0,
  currentMonthRequests: 0,
  avgTokensPerRequest: 0,
  lastRequestAt: null,
  lastRequestTokens: 0,
  remainingPercent: null,
  budgetStatusText: 'Sin datos disponibles.',
  recentRequests: [],
};

function statusTone(status: AIProviderSettings['lastKeyCheckStatus']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'valid') return 'default';
  if (status === 'invalid') return 'destructive';
  if (status === 'unknown') return 'outline';
  return 'secondary';
}

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return 'No disponible';
  return `${value.toFixed(1)}%`;
}

function formatDate(value: string | null): string {
  if (!value) return 'Sin actividad';
  return new Date(value).toLocaleString();
}

export function AISettingsScreen({
  currentUserEmail,
  onGoHome,
  onGoMyRecipes,
  onGoFavorites,
  onGoWeeklyPlan,
  onGoShoppingList,
  onGoSettings,
  onOpenReleases,
  onSignOut,
}: AISettingsScreenProps) {
  const [settings, setSettings] = useState<AIProviderSettings | null>(null);
  const [usage, setUsage] = useState<AIUsageSnapshot | null>(null);
  const [supportedModels, setSupportedModels] = useState<string[]>([]);
  const [form, setForm] = useState<SettingsFormState>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isDeletingKey, setIsDeletingKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const syncForm = (nextSettings: AIProviderSettings) => {
    setForm((prev) => ({
      ...prev,
      authMode: nextSettings.authMode,
      googleModel: nextSettings.googleModel,
      tokenBudgetMode: nextSettings.tokenBudgetMode,
      monthlyTokenLimit: nextSettings.monthlyTokenLimit ? String(nextSettings.monthlyTokenLimit) : '',
      budgetAmount: nextSettings.budgetAmount ? String(nextSettings.budgetAmount) : '',
      apiKeyInput: '',
    }));
  };

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetchAISettings();
      setSettings(payload.settings);
      setUsage(payload.usage);
      setSupportedModels(payload.supportedModels);
      syncForm(payload.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la configuración IA.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const effectiveSettings = settings ?? fallbackSettings;
  const effectiveUsage = usage ?? fallbackUsage;
  const availableModels = supportedModels.length > 0 ? supportedModels : [effectiveSettings.googleModel];

  const hasStoredKey = Boolean(effectiveSettings.isKeyConfigured);
  const remainingSummary = useMemo(() => {
    if (!effectiveUsage) return 'No disponible';
    if (effectiveUsage.budgetMode === 'app_limit') {
      return formatPercent(effectiveUsage.remainingPercent);
    }
    if (effectiveUsage.budgetMode === 'cloud_budget') {
      return 'Pendiente de integración cloud';
    }
    return 'Sin límite configurado';
  }, [effectiveUsage]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = await updateAISettings({
        authMode: form.authMode,
        googleModel: form.googleModel,
        tokenBudgetMode: form.tokenBudgetMode,
        monthlyTokenLimit: form.monthlyTokenLimit ? Number(form.monthlyTokenLimit) : null,
        budgetAmount: form.budgetAmount ? Number(form.budgetAmount) : null,
      });
      setSettings(payload.settings);
      setUsage(payload.usage);
      setSupportedModels(payload.supportedModels);
      syncForm(payload.settings);
      setSuccess('Configuración IA guardada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = await validateStoredOrNewGoogleKey({
        apiKey: form.apiKeyInput.trim() || undefined,
        googleModel: form.googleModel,
      });
      setSettings(payload.settings);
      setUsage(payload.usage);
      syncForm(payload.settings);
      setSuccess(payload.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar la API key.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDeleteKey = async () => {
    setIsDeletingKey(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = await deleteStoredGoogleKey();
      setSettings(payload.settings);
      setUsage(payload.usage);
      setSupportedModels(payload.supportedModels);
      syncForm(payload.settings);
      setSuccess('La API key guardada fue eliminada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la API key.');
    } finally {
      setIsDeletingKey(false);
    }
  };

  if (isLoading) {
    return (
      <MainShellLayout
        activeItem="settings"
        currentUserEmail={currentUserEmail}
        onGoHome={onGoHome}
        onGoMyRecipes={onGoMyRecipes}
        onGoFavorites={onGoFavorites}
        onGoWeeklyPlan={onGoWeeklyPlan}
        onGoShoppingList={onGoShoppingList}
        onGoSettings={onGoSettings}
        onSignOut={onSignOut}
      >
        <ProductPage>
          <ProductContainer>
            <div className="rounded-[1.75rem] border border-primary/10 bg-card/85 px-6 py-4 text-sm text-slate-700 shadow-sm dark:text-slate-200">
              Cargando ajustes IA...
            </div>
          </ProductContainer>
        </ProductPage>
      </MainShellLayout>
    );
  }

  return (
    <MainShellLayout
      activeItem="settings"
      currentUserEmail={currentUserEmail}
      onGoHome={onGoHome}
      onGoMyRecipes={onGoMyRecipes}
      onGoFavorites={onGoFavorites}
      onGoWeeklyPlan={onGoWeeklyPlan}
      onGoShoppingList={onGoShoppingList}
      onGoSettings={onGoSettings}
      onSignOut={onSignOut}
    >
      <ProductPage>
        <ProductContainer className="space-y-6">
          <ProductHeader
            eyebrow="Ajustes IA"
            title="Configura tu proveedor y el consumo"
            description="Mantén la clave de la plataforma o conecta tu propia API key sin salir del lenguaje visual principal del producto."
            actions={
              <Badge variant={statusTone(effectiveSettings.lastKeyCheckStatus)} className="capitalize">
                Estado clave: {effectiveSettings.lastKeyCheckStatus}
              </Badge>
            }
          />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="text-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="h-5 w-5 text-primary" />
                Ajustes IA
              </CardTitle>
              <CardDescription>
                Decide si usas la clave de la plataforma o tu propia API key de Gemini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertTitle>Estado</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Modo de autenticación</Label>
                  <Select value={form.authMode} onValueChange={(value) => setForm((prev) => ({ ...prev, authMode: value as SettingsFormState['authMode'] }))}>
                    <SelectTrigger className="border-primary/10 bg-input-background text-foreground">
                      <SelectValue placeholder="Selecciona un modo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform_key">Usar clave de la plataforma</SelectItem>
                      <SelectItem value="user_key">Usar mi propia clave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modelo Gemini</Label>
                  <Select value={form.googleModel} onValueChange={(value) => setForm((prev) => ({ ...prev, googleModel: value }))}>
                    <SelectTrigger className="border-primary/10 bg-input-background text-foreground">
                      <SelectValue placeholder="Selecciona un modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API key de Google Gemini</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={form.apiKeyInput}
                  onChange={(event) => setForm((prev) => ({ ...prev, apiKeyInput: event.target.value }))}
                  placeholder={hasStoredKey ? `Clave guardada terminada en ${effectiveSettings.keyLast4 ?? '****'}` : 'Pega tu API key para validarla'}
                  className="placeholder:text-slate-400"
                />
                <p className="text-sm text-slate-500">
                  La clave se cifra server-side. El frontend solo envía el valor para validarlo o reemplazarlo.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Modo de presupuesto</Label>
                  <Select value={form.tokenBudgetMode} onValueChange={(value) => setForm((prev) => ({ ...prev, tokenBudgetMode: value as SettingsFormState['tokenBudgetMode'] }))}>
                    <SelectTrigger className="border-primary/10 bg-input-background text-foreground">
                      <SelectValue placeholder="Selecciona un límite" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin límite</SelectItem>
                      <SelectItem value="app_limit">Límite interno por tokens</SelectItem>
                      <SelectItem value="cloud_budget">Budget cloud</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly-limit">Límite mensual de tokens</Label>
                  <Input
                    id="monthly-limit"
                    type="number"
                    min="1"
                    value={form.monthlyTokenLimit}
                    onChange={(event) => setForm((prev) => ({ ...prev, monthlyTokenLimit: event.target.value }))}
                    placeholder="Ej. 300000"
                    className="placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget-amount">Budget cloud referencial</Label>
                <Input
                  id="budget-amount"
                  type="number"
                  min="1"
                  value={form.budgetAmount}
                  onChange={(event) => setForm((prev) => ({ ...prev, budgetAmount: event.target.value }))}
                  placeholder="Ej. 25"
                  className="placeholder:text-slate-400"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void handleSave()} disabled={isSaving}>
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Guardar configuración
                </Button>
                <Button variant="outline" onClick={() => void handleValidate()} disabled={isValidating}>
                  {isValidating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Validar clave
                </Button>
                <Button variant="destructive" onClick={() => void handleDeleteKey()} disabled={isDeletingKey || !hasStoredKey}>
                  {isDeletingKey ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Eliminar clave guardada
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="text-foreground">
            <CardHeader>
              <CardTitle>Consumo y disponibilidad</CardTitle>
              <CardDescription>
                Resumen local del uso de tokens y estado del presupuesto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tokens este mes</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{effectiveUsage.currentMonthTokens}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Promedio por request</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{effectiveUsage.avgTokensPerRequest}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Restante / estado</p>
                <p className="mt-2 text-xl font-semibold text-primary">{remainingSummary}</p>
                <p className="mt-2 text-sm text-slate-400">{effectiveUsage.budgetStatusText}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Último request</p>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{formatDate(effectiveUsage.lastRequestAt)}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Últimos tokens</p>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{effectiveUsage.lastRequestTokens}</p>
                </div>
              </div>

              <Separator className="bg-primary/10" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Historial reciente</h3>
                  <Badge variant="outline" className="border-primary/10 text-slate-600 dark:text-slate-300">
                    {effectiveUsage.currentMonthRequests} requests exitosos
                  </Badge>
                </div>

                <div className="space-y-2">
                  {effectiveUsage.recentRequests.length === 0 && (
                    <p className="text-sm text-slate-500">Aún no hay consumo registrado.</p>
                  )}
                  {effectiveUsage.recentRequests.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-primary/10 bg-background/80 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.model}</p>
                          <p className="text-xs text-slate-500">
                            {item.requestKind} · {item.authMode} · {formatDate(item.createdAt)}
                          </p>
                        </div>
                        <Badge variant={item.requestStatus === 'success' ? 'default' : item.requestStatus === 'blocked' ? 'outline' : 'destructive'}>
                          {item.requestStatus}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Prompt: {item.promptTokens} · Salida: {item.outputTokens} · Total: {item.totalTokens}
                      </p>
                      {item.errorMessage && (
                        <p className="mt-1 text-xs text-red-300">{item.errorMessage}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="text-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Versión y releases
            </CardTitle>
            <CardDescription>
              Consulta qué build está corriendo y revisa el historial de actualizaciones publicadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatVersionLabel()}</p>
              <Badge variant="outline" className="border-primary/10 text-slate-600 dark:text-slate-300">
                Entorno {getEnvironmentLabel(appBuildMetadata.environment)}
              </Badge>
            </div>
            <Button variant="outline" onClick={onOpenReleases}>
              Ver actualizaciones
            </Button>
          </CardContent>
        </Card>
        </ProductContainer>
      </ProductPage>
    </MainShellLayout>
  );
}
