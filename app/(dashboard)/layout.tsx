'use client';

import Link from 'next/link';
import { use, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { CircleIcon, Home, LogOut, LayoutDashboard, Calendar, Users, Bot, Wallet, UsersRound, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/ui/logo';
import { signOut } from '@/app/(login)/actions';
import { useRouter, usePathname } from 'next/navigation';
import { User, Team } from '@/types';
import useSWR, { mutate } from 'swr';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function PlanBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null;
  const normalizedTier = tier.toLowerCase();

  const styles: Record<string, string> = {
    free: "bg-slate-100 text-slate-600 border-slate-200",
    essential: "bg-blue-50 text-blue-700 border-blue-200",
    professional: "bg-purple-50 text-purple-700 border-purple-200",
    business: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const currentStyle = styles[normalizedTier] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border uppercase ${currentStyle}`}>
      {tier}
    </span>
  );
}

function HeaderControls() {
  const { data: team } = useSWR<Team>('/api/team', fetcher);

  return (
    <div className="flex items-center gap-3">
      {team?.planId && <PlanBadge tier={team.plan?.name} />}
      <Suspense fallback={<div className="size-8 rounded-full bg-muted animate-pulse" />}>
        <UserMenu />
      </Suspense>
    </div>
  );
}

const navItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Pacientes", url: "/patients", icon: UsersRound },
  { title: "Gestión Médica", url: "/management", icon: Users },
  { title: "Paola IA", url: "/assistant", icon: Bot },
  { title: "Finanzas", url: "/wallet", icon: Wallet },
];

function AppSidebar() {
  const pathname = usePathname();
  const { data: team } = useSWR<Team>('/api/team', fetcher);

  return (
    <Sidebar>
      <SidebarHeader className="border-b h-[60px] flex items-center px-4">
        <Link
          href="/"
          className="flex items-center  gap-2 font-bold text-xl text-primary w-fit transition-opacity hover:opacity-90 mt-2 mr-4"
        >
          <Logo className="size-8 flex-shrink-0" />
          <span className="leading-none">Medly AI</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings">
                <Settings />
                <span>Configuración</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) {
    return (
      <div className="flex gap-2">
        <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">Pricing</Link>
        <Button asChild className="rounded-full h-8 px-4 text-xs">
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer size-8 hover:opacity-80 transition-opacity">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback className="bg-primary/10 uppercase">
            {(user.name || user.email || 'U').split(' ').map((n) => n[0]).join('').substring(0, 2)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center cursor-pointer">
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <Separator className="my-1" />
        <form action={handleSignOut}>
          <button type="submit" className="w-full">
            <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentNavItem = navItems.find(item => item.url === pathname) || { title: 'Dashboard' };

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-hidden flex flex-col bg-background min-h-screen w-full">
        <header className="h-[60px] border-b flex items-center justify-between px-6 bg-card shrink-0">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <h1 className="text-sm font-semibold text-muted-foreground">{currentNavItem.title}</h1>
          </div>
          <HeaderControls />
        </header>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}
