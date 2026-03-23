import { useState } from 'react';
import { NavLink } from 'react-router';
import {
  Beaker,
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

type NavItem = 'home' | 'global-recipes' | 'my-recipes' | 'favorites' | 'weekly-plan' | 'shopping-list' | 'compound-lab' | 'settings';

interface MainShellLayoutProps {
  activeItem: NavItem;
  currentUserEmail: string | null;
  onSignOut: () => void;
  children: React.ReactNode;
}

interface ShellNavItem {
  id: NavItem;
  label: string;
  icon: typeof Home;
  href: string;
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
    case 'compound-lab':
      return 'Recetas compuestas';
    case 'settings':
      return 'Ajustes';
    default:
      return 'Chef Bot Pro';
  }
}

function getShellNavHref(item: NavItem): string {
  switch (item) {
    case 'home':
      return '/';
    case 'global-recipes':
      return '/recetas-globales';
    case 'my-recipes':
      return '/mis-recetas';
    case 'favorites':
      return '/favoritos';
    case 'weekly-plan':
      return '/plan-semanal';
    case 'shopping-list':
      return '/compras';
    case 'compound-lab':
      return '/experimentos/recetas-compuestas';
    case 'settings':
      return '/ajustes';
  }
}

function renderNavLink(args: {
  item: ShellNavItem;
  activeItem: NavItem;
  className: (isActive: boolean) => string;
  onNavigate?: () => void;
}) {
  const Icon = args.item.icon;
  return (
    <NavLink
      key={args.item.id}
      to={args.item.href}
      onClick={args.onNavigate}
      className={({ isActive }) => args.className(isActive || args.activeItem === args.item.id)}
    >
      <Icon className="size-5" />
      <span>{args.item.label}</span>
    </NavLink>
  );
}

export function MainShellLayout({
  activeItem,
  currentUserEmail,
  onSignOut,
  children,
}: MainShellLayoutProps) {
  const desktopItems: ShellNavItem[] = [
    { id: 'home', label: 'Inicio', icon: Home, href: getShellNavHref('home') },
    { id: 'global-recipes', label: 'Recetas globales', icon: LibraryBig, href: getShellNavHref('global-recipes') },
    { id: 'my-recipes', label: 'Mis recetas', icon: BookHeart, href: getShellNavHref('my-recipes') },
    { id: 'favorites', label: 'Favoritos', icon: Heart, href: getShellNavHref('favorites') },
    { id: 'weekly-plan', label: 'Planificación', icon: CalendarDays, href: getShellNavHref('weekly-plan') },
    { id: 'shopping-list', label: 'Compras', icon: ShoppingBasket, href: getShellNavHref('shopping-list') },
    { id: 'compound-lab', label: 'Recetas compuestas', icon: Beaker, href: getShellNavHref('compound-lab') },
  ];

  const mobileItems: ShellNavItem[] = [
    { id: 'home', label: 'Inicio', icon: Home, href: getShellNavHref('home') },
    { id: 'global-recipes', label: 'Recetas', icon: LibraryBig, href: getShellNavHref('global-recipes') },
    { id: 'weekly-plan', label: 'Plan', icon: CalendarDays, href: getShellNavHref('weekly-plan') },
    { id: 'shopping-list', label: 'Compras', icon: ShoppingBasket, href: getShellNavHref('shopping-list') },
    { id: 'compound-lab', label: 'Lab', icon: Beaker, href: getShellNavHref('compound-lab') },
  ] as const;

  const headerMenuItems: ShellNavItem[] = [
    { id: 'my-recipes', label: 'Mis recetas', icon: BookHeart, href: getShellNavHref('my-recipes') },
    { id: 'favorites', label: 'Favoritos', icon: Heart, href: getShellNavHref('favorites') },
    { id: 'settings', label: 'Ajustes', icon: Settings, href: getShellNavHref('settings') },
    { id: 'compound-lab', label: 'Recetas compuestas', icon: Beaker, href: getShellNavHref('compound-lab') },
  ];

  const bottomMoreItems: ShellNavItem[] = [
    { id: 'favorites', label: 'Favoritos', icon: Heart, href: getShellNavHref('favorites') },
    { id: 'settings', label: 'Ajustes', icon: Settings, href: getShellNavHref('settings') },
    { id: 'compound-lab', label: 'Recetas compuestas', icon: Beaker, href: getShellNavHref('compound-lab') },
  ];

  const moreActive = activeItem === 'my-recipes' || activeItem === 'favorites' || activeItem === 'settings';
  const pageLabel = getPageLabel(activeItem);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isBottomMenuOpen, setIsBottomMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground xl:flex">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-primary/10 bg-sidebar px-4 py-5 xl:flex">
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
          {desktopItems.map((item) => renderNavLink({
            item,
            activeItem,
            className: (isActive) => `flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors ${navClasses(isActive)}`,
          }))}
        </nav>

        <div className="space-y-3 border-t border-primary/10 pt-4">
          {renderNavLink({
            item: { id: 'settings', label: 'Ajustes', icon: Settings, href: getShellNavHref('settings') },
            activeItem,
            className: (isActive) => `flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors ${navClasses(isActive)}`,
          })}

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
        <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/90 backdrop-blur-xl xl:hidden">
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

            <Sheet open={isHeaderMenuOpen} onOpenChange={setIsHeaderMenuOpen}>
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

                  {headerMenuItems.map((item) => renderNavLink({
                    item,
                    activeItem,
                    onNavigate: () => setIsHeaderMenuOpen(false),
                    className: (isActive) => `flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left text-sm font-semibold transition-colors ${navClasses(isActive)}`,
                  }))}
                  <Button
                    variant="outline"
                    className="w-full rounded-[1.25rem] border-primary/20 bg-transparent"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onSignOut();
                    }}
                  >
                    Cerrar sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden pb-24 xl:pb-0">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-primary/10 bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 backdrop-blur-xl xl:hidden">
          <div className="mx-auto grid w-full max-w-md grid-cols-6 gap-1">
            {mobileItems.map((item) => renderNavLink({
              item,
              activeItem,
              className: (isActive) => `flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors active:scale-[0.98] ${
                isActive ? 'bg-primary/12 text-primary' : 'text-slate-500 dark:text-slate-400'
              }`,
            }))}

            <Sheet open={isBottomMenuOpen} onOpenChange={setIsBottomMenuOpen}>
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
                  {bottomMoreItems.map((item) => renderNavLink({
                    item,
                    activeItem,
                    onNavigate: () => setIsBottomMenuOpen(false),
                    className: (isActive) => `flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left text-sm font-semibold transition-colors ${navClasses(isActive)}`,
                  }))}
                  <Button
                    variant="outline"
                    className="w-full rounded-[1.25rem] border-primary/20 bg-transparent"
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      onSignOut();
                    }}
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
