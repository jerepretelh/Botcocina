import { BookHeart, CalendarDays, Heart, Home, Settings, ShoppingBasket, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';

type NavItem = 'home' | 'my-recipes' | 'favorites' | 'weekly-plan' | 'shopping-list' | 'settings';

interface MainShellLayoutProps {
  activeItem: NavItem;
  currentUserEmail: string | null;
  onGoHome: () => void;
  onGoMyRecipes: () => void;
  onGoFavorites: () => void;
  onGoWeeklyPlan: () => void;
  onGoShoppingList: () => void;
  onGoSettings: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

function userInitials(email: string | null): string {
  if (!email) return 'CB';
  const local = email.split('@')[0] ?? '';
  return local.slice(0, 2).toUpperCase() || 'CB';
}

function navClasses(active: boolean): string {
  return active
    ? 'bg-primary/12 text-primary border border-primary/20'
    : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/5 border border-transparent';
}

export function MainShellLayout({
  activeItem,
  currentUserEmail,
  onGoHome,
  onGoMyRecipes,
  onGoFavorites,
  onGoWeeklyPlan,
  onGoShoppingList,
  onGoSettings,
  onSignOut,
  children,
}: MainShellLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 flex h-screen w-20 shrink-0 flex-col border-r border-primary/10 bg-sidebar px-3 py-5 lg:w-72 lg:px-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Sparkles className="size-6" />
          </div>
          <div className="hidden min-w-0 lg:block">
            <h1 className="truncate text-lg font-bold text-sidebar-foreground">Chef Bot Pro</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/90">Sous-chef IA</p>
          </div>
        </div>

        <nav className="mt-8 flex-1 space-y-2">
          <button className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'home')}`} onClick={onGoHome}>
            <Home className="size-5" />
            <span className="hidden lg:block">Inicio</span>
          </button>
          <button className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'my-recipes')}`} onClick={onGoMyRecipes}>
            <BookHeart className="size-5" />
            <span className="hidden lg:block">Mis recetas</span>
          </button>
          <button className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'favorites')}`} onClick={onGoFavorites}>
            <Heart className="size-5" />
            <span className="hidden lg:block">Favoritos</span>
          </button>
          <button className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'weekly-plan')}`} onClick={onGoWeeklyPlan}>
            <CalendarDays className="size-5" />
            <span className="hidden lg:block">Planificación</span>
          </button>
          <button className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'shopping-list')}`} onClick={onGoShoppingList}>
            <ShoppingBasket className="size-5" />
            <span className="hidden lg:block">Compras</span>
          </button>
        </nav>

        <div className="space-y-3 border-t border-primary/10 pt-4">
          <button className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'settings')}`} onClick={onGoSettings}>
            <Settings className="size-5" />
            <span className="hidden lg:block">Ajustes</span>
          </button>

          <div className="hidden items-center gap-3 rounded-2xl bg-primary/5 px-3 py-3 lg:flex">
            <Avatar className="size-10 border border-primary/20">
              <AvatarFallback className="bg-primary/15 font-semibold text-primary">
                {userInitials(currentUserEmail)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{currentUserEmail ?? 'Usuario'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sesión activa</p>
            </div>
          </div>

          <Button variant="outline" className="w-full border-primary/20 bg-transparent text-sm text-sidebar-foreground hover:bg-primary/10" onClick={onSignOut}>
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
