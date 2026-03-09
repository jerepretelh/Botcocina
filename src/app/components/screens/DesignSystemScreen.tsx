import { CheckCircle2, LayoutPanelTop, Palette, Smartphone, Type } from 'lucide-react';
import { ProductContainer, ProductHeader, ProductPage, ProductSurface } from '../ui/product-system';

interface DesignSystemScreenProps {
  onBack: () => void;
}

const tokens = [
  { label: 'Primary', value: '#ec5b13', note: 'Acción principal y acentos.' },
  { label: 'Background', value: '#f8f6f6', note: 'Base clara y cálida del producto.' },
  { label: 'Surface', value: '#fffdfb', note: 'Tarjetas y módulos principales.' },
  { label: 'Dark background', value: '#1a0f0a', note: 'Modo oscuro cálido, no técnico.' },
];

const typography = [
  'Hero: títulos editoriales de entrada y secciones principales.',
  'Section title: jerarquía media para módulos y paneles.',
  'Body: texto funcional con interlineado cómodo.',
  'Meta/eyebrow: labels cortos en mayúsculas para navegación visual.',
];

const principles = [
  'Warm-first: tonos crema, tierra y naranja como identidad principal.',
  'Premium but useful: menos dashboard técnico, más producto culinario editorial.',
  'Soft surfaces: bordes suaves, sombras bajas y glass sutil.',
  'One product voice: bibliotecas, wizard, cooking y settings deben sentirse del mismo sistema.',
];

const patterns = [
  'Shell: sidebar lateral + contenido principal para vistas autenticadas.',
  'Wizard: pantalla centrada con stepper y CTA inferior fija.',
  'Immersive: vista de cocina enfocada, pero aún usando tokens y componentes del sistema.',
  'Library cards: listas y catálogos con la misma jerarquía de imagen, texto y acciones.',
];

export function DesignSystemScreen({ onBack }: DesignSystemScreenProps) {
  return (
    <ProductPage>
      <ProductContainer className="space-y-6">
        <ProductHeader
          eyebrow="Sistema de diseño"
          title="Chef Bot Pro visual system"
          description="Catálogo vivo del estilo unificado que rige home, bibliotecas, wizard, setup, ingredientes, cooking, auth y settings."
          onBack={onBack}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ProductSurface className="p-6">
            <div className="flex items-center gap-2 text-primary">
              <Palette className="size-5" />
              <h2 className="text-xl font-bold">Tokens base</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {tokens.map((token) => (
                <div key={token.label} className="flex items-center justify-between rounded-[1.25rem] border border-primary/10 bg-background/75 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{token.label}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{token.note}</p>
                  </div>
                  <div className="text-right">
                    <div className="h-8 w-12 rounded-xl border border-primary/10 bg-primary/10" style={token.label === 'Primary' ? { backgroundColor: token.value } : token.label === 'Background' ? { backgroundColor: token.value } : token.label === 'Surface' ? { backgroundColor: token.value } : { backgroundColor: token.value }} />
                    <p className="mt-2 text-xs font-semibold text-slate-500">{token.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </ProductSurface>

          <ProductSurface className="p-6">
            <div className="flex items-center gap-2 text-primary">
              <Type className="size-5" />
              <h2 className="text-xl font-bold">Tipografía y tono</h2>
            </div>
            <div className="mt-5 space-y-3">
              {typography.map((item) => (
                <div key={item} className="rounded-[1.25rem] border border-primary/10 bg-background/75 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </ProductSurface>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <ProductSurface className="p-6">
            <div className="flex items-center gap-2 text-primary">
              <LayoutPanelTop className="size-5" />
              <h2 className="text-xl font-bold">Patrones oficiales</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {patterns.map((item) => (
                <div key={item} className="rounded-[1.25rem] border border-primary/10 bg-background/75 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </ProductSurface>

          <ProductSurface className="p-6">
            <div className="flex items-center gap-2 text-primary">
              <Smartphone className="size-5" />
              <h2 className="text-xl font-bold">Criterios de consistencia</h2>
            </div>
            <div className="mt-5 space-y-3">
              {principles.map((item) => (
                <div key={item} className="flex gap-3 rounded-[1.25rem] border border-primary/10 bg-background/75 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </ProductSurface>
        </div>

        <ProductSurface className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Uso esperado</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Qué hacer y qué evitar
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-primary/10 bg-background/75 p-4">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Hacer</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>Usar superficies cálidas, spacing amplio y jerarquía tipográfica consistente.</p>
                <p>Reutilizar shell lateral, headers y CTA del sistema antes de crear nuevos patrones.</p>
                <p>Mantener móvil-first con CTA inferior fija cuando la tarea lo pida.</p>
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-primary/10 bg-background/75 p-4">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Evitar</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>Fondos negro-azulados, gradientes fríos o paneles tipo consola técnica.</p>
                <p>Botones, cards y formularios con estilos únicos por pantalla.</p>
                <p>Componentes shadcn sin adaptar a la identidad visual del producto.</p>
              </div>
            </div>
          </div>
        </ProductSurface>
      </ProductContainer>
    </ProductPage>
  );
}
