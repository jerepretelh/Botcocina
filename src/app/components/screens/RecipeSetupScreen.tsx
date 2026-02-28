import { Recipe, QuantityMode, AmountUnit, Portion } from '../../../types';

interface RecipeSetupScreenProps {
    selectedRecipe: Recipe | null;
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
}

export function RecipeSetupScreen({
    selectedRecipe,
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
    onBack: onBackToRecipeSelect
}: RecipeSetupScreenProps) {
    const isPredefined = Boolean(selectedRecipe?.id);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900/70 border border-slate-700 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-2xl">

                {/* Recipe Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 text-4xl">
                        {selectedRecipe?.emoji || '🍳'}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
                        {selectedRecipe?.name || 'Tu receta'}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-medium">Configuración</p>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                    <button
                        onClick={() => setQuantityMode('people')}
                        className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${quantityMode === 'people'
                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                            : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:border-slate-500'
                            }`}
                    >
                        👥 Porciones
                    </button>
                    <button
                        onClick={() => setQuantityMode('have')}
                        className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${quantityMode === 'have'
                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                            : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:border-slate-500'
                            }`}
                    >
                        ⚖️ Ingredientes
                    </button>
                </div>

                {quantityMode === 'have' && (
                    <div className="flex justify-center gap-3 mb-6">
                        <button
                            onClick={() => onAmountUnitChange('units')}
                            className={`px-4 py-2 text-xs rounded-full border transition-all font-semibold ${amountUnit === 'units' ? 'bg-slate-100 text-slate-900 border-white' : 'text-slate-400 border-slate-700 hover:border-slate-500'
                                }`}
                        >
                            Unidades
                        </button>
                        <button
                            onClick={() => onAmountUnitChange('grams')}
                            className={`px-4 py-2 text-xs rounded-full border transition-all font-semibold ${amountUnit === 'grams' ? 'bg-slate-100 text-slate-900 border-white' : 'text-slate-400 border-slate-700 hover:border-slate-500'
                                }`}
                        >
                            Gramos
                        </button>
                    </div>
                )}

                {/* Counter Area */}
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center gap-6 md:gap-8 mb-4">
                        <button
                            onClick={() =>
                                quantityMode === 'people'
                                    ? setPeopleCount((prev: number) => Math.max(1, prev - 1))
                                    : setAvailableCount((prev: number) => Math.max(1, prev - (amountUnit === 'grams' ? 50 : 1)))
                            }
                            className="w-14 h-14 md:w-16 md:h-16 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center text-white text-3xl font-light hover:bg-slate-700 active:scale-95 transition-all outline-none"
                        >
                            −
                        </button>

                        <div className="flex flex-col items-center min-w-[100px]">
                            <span className="text-6xl md:text-7xl font-black text-white tracking-tighter">
                                {quantityMode === 'people' ? peopleCount : availableCount}
                            </span>
                            <span className="text-xs text-orange-400 font-bold uppercase tracking-widest mt-1">
                                {quantityMode === 'people' ? (peopleCount === 1 ? 'Persona' : 'Personas') : (amountUnit === 'grams' ? 'Gramos' : 'Unidades')}
                            </span>
                        </div>

                        <button
                            onClick={() =>
                                quantityMode === 'people'
                                    ? setPeopleCount((prev: number) => Math.min(8, prev + 1))
                                    : setAvailableCount((prev: number) => Math.min(amountUnit === 'grams' ? 5000 : 20, prev + (amountUnit === 'grams' ? 50 : 1)))
                            }
                            className="w-14 h-14 md:w-16 md:h-16 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center text-white text-3xl font-light hover:bg-slate-700 active:scale-95 transition-all outline-none"
                        >
                            +
                        </button>
                    </div>

                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl py-3 px-6 text-orange-200 text-sm font-medium shadow-inner">
                        {quantityMode === 'people'
                            ? `Cocinando para ${peopleCount} raciones`
                            : `Usando ${availableCount}${amountUnit === 'grams' ? 'g' : ''} de ${selectedRecipe?.ingredient || 'base'}`}
                    </div>
                </div>

                {isTubersBoilRecipe && (
                    <div className="mb-8 space-y-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 text-left">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🥔</span>
                            <p className="text-xs uppercase tracking-widest text-slate-300 font-bold">Ajustes de producto</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-black mb-2 ml-1">Variedad</p>
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
                                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${produceType === option.id ? 'bg-orange-500 text-white border-orange-400' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-600'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-black mb-2 ml-1">Tamaño</p>
                            <div className="flex gap-2">
                                {[
                                    { id: 'small', label: 'Pequ.' },
                                    { id: 'medium', label: 'Med.' },
                                    { id: 'large', label: 'Gran.' },
                                ].map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => setProduceSize(option.id as 'small' | 'medium' | 'large')}
                                        className={`px-4 py-1.5 text-xs rounded-lg border transition-all ${produceSize === option.id ? 'bg-orange-500 text-white border-orange-400' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-600'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Technical Info (Hidden by default or simplified) */}
                {!isPredefined && (
                    <div className="mb-6 text-[10px] text-slate-500 uppercase tracking-widest text-center">
                        Escalado automático: {setupPortionPreview} raciones · x{setupScaleFactor.toFixed(2)}
                    </div>
                )}

                {/* Start Button */}
                <div className="space-y-4">
                    <button
                        onClick={onContinue}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 rounded-3xl text-xl font-black shadow-xl shadow-orange-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all transform active:brightness-90 uppercase tracking-wider"
                    >
                        Comenzar
                    </button>
                    <button
                        onClick={onBackToRecipeSelect}
                        className="w-full text-slate-500 py-2.5 text-sm font-bold hover:text-slate-300 transition-colors uppercase tracking-widest"
                    >
                        ← Volver
                    </button>
                </div>
            </div>
        </div >
    );
}
