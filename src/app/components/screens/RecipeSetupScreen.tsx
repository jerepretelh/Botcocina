import { AmountUnit, Portion, QuantityMode, Recipe, RecipeSetupBehavior, SavedRecipeContextSummary, UserRecipeCookingConfig } from '../../../types';
import { ProductBottomBar, ProductContainer, ProductHeader, ProductPage, ProductSurface } from '../ui/product-system';

interface RecipeSetupScreenProps {
    selectedRecipe: Recipe | null;
    setupBehavior: RecipeSetupBehavior;
    savedConfig: UserRecipeCookingConfig | null;
    savedContextSummary: SavedRecipeContextSummary | null;
    quantityMode: QuantityMode;
    amountUnit: AmountUnit;
    peopleCount: number;
    availableCount: number;
    produceType: string;
    produceSize: 'small' | 'medium' | 'large';
    setupPortionPreview: Portion;
    setupScaleFactor: number;
    isTubersBoilRecipe: boolean;
    setQuantityMode: (mode: QuantityMode) => void;
    setPeopleCount: (val: any) => void;
    setAvailableCount: (val: any) => void;
    setProduceType: (type: string) => void;
    setProduceSize: (size: 'small' | 'medium' | 'large') => void;
    onAmountUnitChange: (unit: AmountUnit) => void;
    onContinue: () => void;
    onBack: () => void;
    onPlanRecipe?: () => void;
}

export function RecipeSetupScreen({
    selectedRecipe,
    setupBehavior,
    savedConfig,
    savedContextSummary,
    quantityMode,
    amountUnit,
    peopleCount,
    availableCount,
    produceType,
    produceSize,
    setupPortionPreview,
    setupScaleFactor,
    isTubersBoilRecipe,
    setQuantityMode,
    setPeopleCount,
    setAvailableCount,
    setProduceType,
    setProduceSize,
    onAmountUnitChange,
    onContinue,
    onBack: onBackToRecipeSelect,
    onPlanRecipe,
}: RecipeSetupScreenProps) {
    const isPredefined = Boolean(selectedRecipe?.id);
    const supportsIngredientMode = setupBehavior !== 'servings_only';
    const lastUsedLabel = savedConfig?.lastUsedAt
        ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(savedConfig.lastUsedAt))
        : null;
    const sourceLines = [
        savedContextSummary?.servings ? `Creada para ${savedContextSummary.servings} ${savedContextSummary.servings === 1 ? 'persona' : 'personas'}` : null,
        savedContextSummary?.quantityMode === 'have' && savedContextSummary?.availableCount
            ? `Basada en ${savedContextSummary.availableCount}${savedContextSummary.amountUnit === 'grams' ? ' g' : ''} de ingrediente base`
            : null,
        savedContextSummary?.availableIngredients?.length
            ? `Contexto original: ${savedContextSummary.availableIngredients.slice(0, 3).join(', ')}`
            : null,
        savedContextSummary?.avoidIngredients?.length
            ? `Evitar: ${savedContextSummary.avoidIngredients.slice(0, 3).join(', ')}`
            : null,
    ].filter(Boolean) as string[];
    const savedModeLabel = savedConfig?.quantityMode === 'have' ? 'Configuración basada en ingredientes' : 'Configuración basada en porciones';

    return (
        <ProductPage>
            <ProductContainer className="max-w-3xl">
                <ProductHeader
                    eyebrow="Configuración"
                    title={selectedRecipe?.name || 'Tu receta'}
                    description="Ajusta la base de cocción antes de pasar al checklist de ingredientes."
                    onBack={onBackToRecipeSelect}
                    actions={onPlanRecipe ? (
                        <button
                            type="button"
                            onClick={onPlanRecipe}
                            className="rounded-full border border-primary/20 bg-card/80 px-4 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/8"
                        >
                            Planificar
                        </button>
                    ) : undefined}
                />

                <ProductSurface className="p-6 md:p-8">
                    <div className="flex flex-col items-center border-b border-primary/10 pb-8 text-center">
                        <div className="mb-4 flex size-20 items-center justify-center rounded-[1.5rem] bg-primary/10 text-4xl shadow-sm">
                            {selectedRecipe?.emoji || selectedRecipe?.icon || '🍳'}
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Base de cocción</p>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Ajusta la cantidad inicial
                        </h2>
                    </div>

                    <div className="mt-8 grid gap-6">
                        {savedConfig && (
                            <div className="rounded-[1.5rem] border border-primary/15 bg-primary/6 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Configuración guardada</p>
                                        <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{savedModeLabel}</h3>
                                        {lastUsedLabel && (
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Último uso: {lastUsedLabel}</p>
                                        )}
                                    </div>
                                    <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm dark:bg-white/10">
                                        {savedConfig.quantityMode === 'have'
                                            ? `${savedConfig.availableCount ?? availableCount}${savedConfig.amountUnit === 'grams' ? ' g' : ' uds.'}`
                                            : `${savedConfig.peopleCount ?? peopleCount} porciones`}
                                    </div>
                                </div>
                                {sourceLines.length > 0 && (
                                    <div className="mt-4 grid gap-2">
                                        {sourceLines.map((line) => (
                                            <p key={line} className="text-sm text-slate-600 dark:text-slate-300">
                                                {line}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {supportsIngredientMode ? (
                            <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-primary/6 p-2">
                                <button
                                    onClick={() => setQuantityMode('people')}
                                    className={`rounded-[1.25rem] px-4 py-3 text-sm font-bold transition-all ${quantityMode === 'people'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-white/5'
                                        }`}
                                >
                                    👥 Porciones
                                </button>
                                <button
                                    onClick={() => setQuantityMode('have')}
                                    className={`rounded-[1.25rem] px-4 py-3 text-sm font-bold transition-all ${quantityMode === 'have'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-white/5'
                                        }`}
                                >
                                    ⚖️ Ingredientes
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-[1.5rem] border border-primary/12 bg-primary/5 px-5 py-4">
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    Esta receta se reabre por porciones. La base por ingredientes no aplica bien a su escalado.
                                </p>
                            </div>
                        )}

                        {supportsIngredientMode && quantityMode === 'have' && (
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => onAmountUnitChange('units')}
                                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${amountUnit === 'units' ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/10 bg-card text-slate-500 dark:text-slate-400'}`}
                                >
                                    Unidades
                                </button>
                                <button
                                    onClick={() => onAmountUnitChange('grams')}
                                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${amountUnit === 'grams' ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/10 bg-card text-slate-500 dark:text-slate-400'}`}
                                >
                                    Gramos
                                </button>
                            </div>
                        )}

                        <div className="rounded-[1.75rem] border border-primary/12 bg-background/70 p-6">
                            <div className="flex items-center justify-between gap-6">
                                <button
                                    onClick={() =>
                                        quantityMode === 'people'
                                            ? setPeopleCount((prev: number) => Math.max(1, prev - 1))
                                            : setAvailableCount((prev: number) => Math.max(1, prev - (amountUnit === 'grams' ? 50 : 1)))
                                    }
                                    className="flex size-14 items-center justify-center rounded-full border border-primary/20 bg-card text-3xl text-primary transition-transform active:scale-95"
                                >
                                    −
                                </button>

                                <div className="text-center">
                                    <span className="text-6xl font-black tracking-tight text-primary">
                                        {quantityMode === 'people' ? peopleCount : availableCount}
                                    </span>
                                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                                        {quantityMode === 'people' ? (peopleCount === 1 ? 'Persona' : 'Personas') : (amountUnit === 'grams' ? 'Gramos' : 'Unidades')}
                                    </p>
                                </div>

                                <button
                                    onClick={() =>
                                        quantityMode === 'people'
                                            ? setPeopleCount((prev: number) => Math.min(8, prev + 1))
                                            : setAvailableCount((prev: number) => Math.min(amountUnit === 'grams' ? 5000 : 20, prev + (amountUnit === 'grams' ? 50 : 1)))
                                    }
                                    className="flex size-14 items-center justify-center rounded-full bg-primary text-3xl text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95"
                                >
                                    +
                                </button>
                            </div>

                            <div className="mt-6 rounded-[1.25rem] bg-primary/8 px-5 py-4 text-center text-sm font-medium text-primary">
                                {quantityMode === 'people'
                                    ? `Cocinando para ${peopleCount} raciones`
                                    : `Usando ${availableCount}${amountUnit === 'grams' ? ' g' : ' unidades'} de ${selectedRecipe?.ingredient || 'base'}`}
                            </div>
                        </div>

                        {isTubersBoilRecipe && (
                            <div className="grid gap-4 rounded-[1.75rem] border border-primary/12 bg-background/70 p-6">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Ajustes de producto</p>
                                    <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">Variedad y tamaño</h3>
                                </div>
                                <div>
                                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Variedad</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 'blanca', label: 'Blanca' },
                                            { id: 'yungay', label: 'Yungay' },
                                            { id: 'huayro', label: 'Huayro' },
                                            { id: 'canchan', label: 'Canchán' },
                                            { id: 'camote_amarillo', label: 'Camote Am.' },
                                            { id: 'camote_morado', label: 'Camote Mor.' },
                                        ].map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => setProduceType(option.id)}
                                                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${produceType === option.id ? 'border-primary/25 bg-primary text-primary-foreground' : 'border-primary/10 bg-card text-slate-600 dark:text-slate-300'}`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Tamaño</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 'small', label: 'Pequeño' },
                                            { id: 'medium', label: 'Mediano' },
                                            { id: 'large', label: 'Grande' },
                                        ].map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => setProduceSize(option.id as 'small' | 'medium' | 'large')}
                                                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${produceSize === option.id ? 'border-primary/25 bg-primary text-primary-foreground' : 'border-primary/10 bg-card text-slate-600 dark:text-slate-300'}`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isPredefined && (
                            <div className="rounded-[1.25rem] border border-dashed border-primary/18 bg-primary/5 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Escalado automático: {setupPortionPreview} raciones · x{setupScaleFactor.toFixed(2)}
                            </div>
                        )}
                    </div>
                </ProductSurface>
            </ProductContainer>

            <ProductBottomBar>
                <button
                    onClick={onContinue}
                    className="w-full rounded-[1.25rem] bg-primary py-4 text-lg font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                >
                    Continuar
                </button>
            </ProductBottomBar>
        </ProductPage>
    );
}
