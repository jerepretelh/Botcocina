import {
  BookHeart,
  CalendarDays,
  Heart,
  Home,
  LibraryBig,
  Menu,
  Settings,
  ShoppingBasket,
  Sparkles,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';

type NavItem = 'home' | 'global-recipes' | 'my-recipes' | 'favorites' | 'weekly-plan' | 'shopping-list' | 'settings';

interface MainShellLayoutProps {
  activeItem: NavItem;
  currentUserEmail: string | null;
  onGoHome: () => void;
  onGoGlobalRecipes: () => void;
  onGoMyRecipes: () => void;
  onGoFavorites: () => void;
  onGoWeeklyPlan: () => void;
  onGoShoppingList: () => void;
  onGoSettings: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

interface NavActionItem {
  id: NavItem;
  label: string;
  icon: typeof Home;
  onClick: () => void;
}

function userInitials(email: string | null): string {
  if (!email) return 'CB';
  const local = email.split('@')[0] ?? '';
  return local.slice(0, 2).toUpperCase() || 'CB';
}

function navClasses(active: boolean): string {
  return active
    ? 'border border-primary/20 bg-primary/12 text-primary'
    : 'border border-transparent text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-400';
}

function getPageLabel(activeItem: NavItem): string {
  switch (activeItem) {
    case 'home':
      return 'Inicio';
    case 'my-recipes':
      return 'Mis recetas';
    case 'global-recipes':
      return 'Recetas globales';
    case 'favorites':
      return 'Favoritos';
    case 'weekly-plan':
      return 'Planificación';
    case 'shopping-list':
      return 'Compras';
    case 'settings':
      return 'Ajustes';
    default:
      return 'Chef Bot Pro';
  }
}

export function MainShellLayout({
  activeItem,
  currentUserEmail,
  onGoHome,
  onGoGlobalRecipes,
  onGoMyRecipes,
  onGoFavorites,
  onGoWeeklyPlan,
  onGoShoppingList,
  onGoSettings,
  onSignOut,
  children,
}: MainShellLayoutProps) {
  const desktopItems: NavActionItem[] = [
    { id: 'home', label: 'Inicio', icon: Home, onClick: onGoHome },
    { id: 'global-recipes', label: 'Recetas globales', icon: LibraryBig, onClick: onGoGlobalRecipes },
    { id: 'my-recipes', label: 'Mis recetas', icon: BookHeart, onClick: onGoMyRecipes },
    { id: 'favorites', label: 'Favoritos', icon: Heart, onClick: onGoFavorites },
    { id: 'weekly-plan', label: 'Planificación', icon: CalendarDays, onClick: onGoWeeklyPlan },
    { id: 'shopping-list', label: 'Compras', icon: ShoppingBasket, onClick: onGoShoppingList },
  ];

  const mobileItems = [
    { id: 'home', label: 'Inicio', icon: Home, onClick: onGoHome },
    { id: 'global-recipes', label: 'Recetas', icon: LibraryBig, onClick: onGoGlobalRecipes },
    { id: 'weekly-plan', label: 'Plan', icon: CalendarDays, onClick: onGoWeeklyPlan },
    { id: 'shopping-list', label: 'Compras', icon: ShoppingBasket, onClick: onGoShoppingList },
  ] as const;

  const moreActive = activeItem === 'my-recipes' || activeItem === 'favorites' || activeItem === 'settings';
  const pageLabel = getPageLabel(activeItem);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground lg:flex">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-primary/10 bg-sidebar px-4 py-5 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Sparkles className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-sidebar-foreground">Chef Bot Pro</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/90">Sous-chef IA</p>
          </div>
        </div>

        <nav className="mt-8 flex-1 space-y-2">
          {desktopItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === item.id)}`}
                onClick={item.onClick}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-primary/10 pt-4">
          <button
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'settings')}`}
            onClick={onGoSettings}
          >
            <Settings className="size-5" />
            <span>Ajustes</span>
          </button>

          <div className="flex items-center gap-3 rounded-2xl bg-primary/5 px-3 py-3">
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

          <Button
            variant="outline"
            className="w-full border-primary/20 bg-transparent text-sm text-sidebar-foreground hover:bg-primary/10"
            onClick={onSignOut}
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex min-h-[100dvh] flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/90 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Chef Bot Pro</p>
                <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{pageLabel}</p>
              </div>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex size-11 items-center justify-center rounded-full border border-primary/15 bg-card/80 text-foreground transition-colors active:scale-[0.98]"
                  aria-label="Abrir menú"
                >
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[1.75rem] border-primary/10 bg-background px-0 pb-6">
                <SheetHeader className="px-5 pb-3 pt-5">
                  <SheetTitle>Más opciones</SheetTitle>
                  <SheetDescription>
                    Accede a favoritos, ajustes y a la sesión actual sin salir del flujo principal.
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-3 px-5">
                  <div className="flex items-center gap-3 rounded-[1.25rem] border border-primary/10 bg-card/80 px-4 py-3">
                    <Avatar className="size-11 border border-primary/20">
                      <AvatarFallback className="bg-primary/15 font-semibold text-primary">
                        {userInitials(currentUserEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{currentUserEmail ?? 'Usuario'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Sesión activa</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onGoMyRecipes}
                    className={`flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'my-recipes')}`}
                  >
                    <BookHeart className="size-5" />
                    Mis recetas
                  </button>
                  <button
                    type="button"
                    onClick={onGoFavorites}
                    className={`flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'favorites')}`}
                  >
                    <Heart className="size-5" />
                    Favoritos
                  </button>
                  <button
                    type="button"
                    onClick={onGoSettings}
                    className={`flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'settings')}`}
                  >
                    <Settings className="size-5" />
                    Ajustes
                  </button>
                  <Button
                    variant="outline"
                    className="w-full rounded-[1.25rem] border-primary/20 bg-transparent"
                    onClick={onSignOut}
                  >
                    Cerrar sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-primary/10 bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid w-full max-w-md grid-cols-5 gap-1">
            {mobileItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors active:scale-[0.98] ${
                    isActive
                      ? 'bg-primary/12 text-primary'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors active:scale-[0.98] ${
                    moreActive ? 'bg-primary/12 text-primary' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Menu className="size-5" />
                  <span>Más</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[1.75rem] border-primary/10 bg-background px-0 pb-6">
                <SheetHeader className="px-5 pb-3 pt-5">
                  <SheetTitle>Navegación y cuenta</SheetTitle>
                  <SheetDescription>Todo lo secundario queda aquí para que el contenido principal respire mejor en móvil.</SheetDescription>
                </SheetHeader>
                <div className="space-y-3 px-5">
                  <button
                    type="button"
                    onClick={onGoFavorites}
                    className={`flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'favorites')}`}
                  >
                    <Heart className="size-5" />
                    Favoritos
                  </button>
                  <button
                    type="button"
                    onClick={onGoSettings}
                    className={`flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left text-sm font-semibold transition-colors ${navClasses(activeItem === 'settings')}`}
                  >
                    <Settings className="size-5" />
                    Ajustes
                  </button>
                  <Button
                    variant="outline"
                    className="w-full rounded-[1.25rem] border-primary/20 bg-transparent"
                    onClick={onSignOut}
                  >
                    Cerrar sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </div>
  );
}
