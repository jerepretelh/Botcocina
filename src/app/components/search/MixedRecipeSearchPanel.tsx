import { Search, Sparkles, X } from 'lucide-react';
import type { MixedRecipeSearchResult } from '../../../types';

function getHighlightedParts(text: string, query: string): Array<{ value: string; match: boolean }> {
  if (!query.trim()) return [{ value: text, match: false }];

  const normalizedQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const parts: Array<{ value: string; match: boolean }> = [];
  let buffer = '';
  let index = 0;

  while (index < text.length) {
    const slice = text.slice(index);
    const normalizedSlice = slice
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const matchIndex = normalizedSlice.indexOf(normalizedQuery);

    if (matchIndex < 0) {
      buffer += slice;
      break;
    }

    const start = index + matchIndex;
    const end = start + query.length;

    if (start > index) {
      parts.push({ value: text.slice(index, start), match: false });
    }

    parts.push({ value: text.slice(start, end), match: true });
    index = end;
  }

  if (buffer) {
    parts.push({ value: buffer, match: false });
  }

  return parts.length > 0 ? parts : [{ value: text, match: false }];
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = getHighlightedParts(text, query);

  return (
    <>
      {parts.map((part, index) => (
        <span
          key={`${part.value}-${index}`}
          className={part.match ? 'rounded-[0.3rem] bg-[#f5d4c2] px-0.5 text-[#d96b39]' : undefined}
        >
          {part.value}
        </span>
      ))}
    </>
  );
}

export function MixedRecipeSearchPanel({
  query,
  onQueryChange,
  results,
  isLoading,
  placeholder,
  emptyMessage,
  totalLabel,
  compact = false,
  onSelectResult,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  results: MixedRecipeSearchResult[];
  isLoading?: boolean;
  placeholder: string;
  emptyMessage: string;
  totalLabel: string;
  compact?: boolean;
  onSelectResult: (result: MixedRecipeSearchResult) => void;
}) {
  return (
    <div className="w-full">
      <div
        className={`overflow-hidden rounded-[2rem] bg-[#f5f3f1] shadow-[0_10px_26px_rgba(78,64,53,0.12)] ${
          query.trim() ? 'ring-2 ring-[#da6f3e]' : 'ring-1 ring-[#d9d6d2]'
        }`}
      >
        <div className={`flex items-center gap-4 px-6 ${compact ? 'py-4.5' : 'py-5 md:px-7 md:py-5.5'}`}>
          <Search className={`${compact ? 'size-6' : 'size-7'} shrink-0 text-[#98a1b2]`} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            className={`min-w-0 flex-1 bg-transparent font-medium text-slate-900 outline-none placeholder:text-[#9aa1ae] ${
              compact ? 'text-xl' : 'text-lg md:text-[1.15rem]'
            }`}
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="flex size-9 items-center justify-center rounded-full text-[#98a1b2] transition-colors hover:bg-black/5 hover:text-slate-700"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-5" />
            </button>
          ) : null}
        </div>

        {(query.trim() || compact) && (
          <div className="border-t border-[#ddd7d1] bg-[#f9f8f6]">
            <div className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-500">
              <Sparkles className="size-4 text-[#8d97a8]" />
              <span>{isLoading ? 'Buscando resultados...' : totalLabel}</span>
            </div>

            {isLoading ? (
              <div className="space-y-4 px-6 py-5">
                {Array.from({ length: compact ? 4 : 5 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-[1.25rem] bg-white/70" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">{emptyMessage}</div>
            ) : (
              <div>
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => onSelectResult(result)}
                    className={`flex w-full items-start gap-4 px-6 py-5 text-left transition-colors hover:bg-[#f1ece7] ${
                      index !== 0 ? 'border-t border-[#e2ddd8]' : ''
                    }`}
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#ebe2db] text-[1.75rem]">
                      {result.kind === 'recipe' ? result.recipe?.icon ?? result.categoryIcon : result.categoryIcon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h3 className="text-base font-bold tracking-tight text-slate-900 md:text-[1.05rem]">
                          <HighlightedText text={result.title} query={query} />
                        </h3>
                        <span
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${
                            result.kind === 'recipe'
                              ? result.metaLabel === 'Mi receta'
                                ? 'bg-[#cfead6] text-[#0d8a48]'
                                : 'bg-[#d8e5ff] text-[#2457eb]'
                              : 'bg-[#f7e0d4] text-[#da6f3e]'
                          }`}
                        >
                          {result.metaLabel}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-600 md:text-[0.95rem]">
                        <HighlightedText text={result.description} query={query} />
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="rounded-lg bg-[#f7e8df] px-3 py-1 text-sm font-semibold text-[#da6f3e]">
                          {result.categoryLabel}
                        </span>
                        <span className="rounded-lg bg-[#e9ebef] px-3 py-1 text-sm font-semibold text-slate-600">
                          {result.kind === 'recipe' ? 'Receta completa' : 'Base para IA'}
                        </span>
                      </div>
                    </div>
                    <span className="hidden shrink-0 rounded-full bg-[#da6f3e] px-4 py-2 text-sm font-bold text-white md:inline-flex">
                      {result.actionLabel}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
