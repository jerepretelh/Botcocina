export type PersistError = {
  message?: string | null;
  details?: string | null;
  code?: string | null;
};

export type PersistClient = {
  from: (table: string) => {
    insert: (payload: unknown) => {
      select: (columns: string) => {
        single: () => Promise<{ data: { id?: string } | null }>;
      };
    } | Promise<{ error?: PersistError | null }> | { error?: PersistError | null };
    update: (payload: unknown) => {
      eq: (column: string, value: unknown) => Promise<{ error?: PersistError | null }> | { error?: PersistError | null };
    };
    upsert: (payload: unknown, options?: unknown) => Promise<{ error: PersistError | null }> | { error: PersistError | null };
    delete: () => {
      eq: (column: string, value: unknown) => Promise<{ error?: PersistError | null }> | { error?: PersistError | null };
    };
  };
};

export function isMissingCompoundColumnError(error: PersistError | null | undefined): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return error.code === '42703' || (message.includes('column') && (message.includes('experience') || message.includes('compound_meta')));
}

export function isMissingRecipeV2ColumnError(error: PersistError | null | undefined): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  if (message.includes('experience') || message.includes('compound_meta')) {
    return false;
  }
  return error.code === '42703' || (
    message.includes('column') && (
      message.includes('base_yield_')
      || message.includes('ingredients_json')
      || message.includes('steps_json')
      || message.includes('time_summary_json')
      || message.includes('target_yield')
    )
  );
}

export function isMissingUserRecipeConfigsTableError(error: PersistError | null | undefined): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return error.code === 'PGRST205'
    || message.includes('could not find the table')
    || (message.includes('relation') && message.includes('does not exist'));
}
