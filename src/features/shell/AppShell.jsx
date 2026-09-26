import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { NavLink } from 'react-router'
import { ChartColumnIcon, LogOutIcon, MoonIcon, PackageIcon, PackagePlusIcon, ShoppingCartIcon, SunIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark } from './BrandMark'

// The frame every signed-in screen sits in: the green sidebar with the sections of the
// app, who is signed in, the light/dark switch and the way out.
//
// `children` is whatever JSX is placed between <AppShell> and </AppShell> - the current
// screen - the same idea as a layout's placeholder in other frameworks.
export function AppShell({ account, onSignOut, children }) {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-svh md:w-60">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <BrandMark />
          <span className="text-[15px] font-semibold text-white">{t('app.name')}</span>
        </div>

        {/* On a phone the sections are a row that scrolls sideways - more of them than fit
            the width - instead of a row that pushes the whole page wider. */}
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] md:flex-col md:overflow-visible md:pb-0">
          <SidebarItem to="/produtos" icon={PackageIcon} label={t('shell.products')} />
          <SidebarItem to="/entrada" icon={PackagePlusIcon} label={t('shell.receiving')} />
          <SidebarItem to="/vender" icon={ShoppingCartIcon} label={t('shell.sell')} />
          <SidebarItem to="/vendas" icon={ChartColumnIcon} label={t('shell.sales')} />
        </nav>

        <div className="mt-auto hidden border-t border-sidebar-border px-4 py-4 md:block">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {account.name.slice(0, 1).toLocaleUpperCase('pt-BR')}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white uppercase">{account.name}</p>
              <p className="truncate text-xs">
                {account.shopName} · {t(`shell.roles.${account.role}`)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-xs">
            <button
              type="button"
              onClick={() => setTheme(dark ? 'light' : 'dark')}
              className="flex items-center gap-1.5 opacity-80 transition-opacity hover:opacity-100"
            >
              {dark ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
              {dark ? t('shell.light') : t('shell.dark')}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1.5 opacity-80 transition-opacity hover:opacity-100"
            >
              <LogOutIcon className="size-3.5" />
              {t('shell.signOut')}
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}

// A component received as a prop is used like any tag once it has a capitalised name -
// that is why `icon` is renamed to `Icon` on the way in.
//
// NavLink is a link that knows whether its address is the current one: it sets
// aria-current="page" on its own, and passes `isActive` to a className function.
function SidebarItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors',
          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/60',
        )
      }
    >
      <Icon className="size-4" />
      {label}
    </NavLink>
  )
}
