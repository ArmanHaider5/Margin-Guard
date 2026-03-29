import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Settings, Target, BookOpen, History, PlusCircle } from "lucide-react";
import { Link } from "wouter";

export function AuthHeader() {
  const { user } = useAuth();

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-foreground">Margin Guard</span>
              </div>
            </Link>
            
            <nav className="hidden sm:flex items-center gap-1">
              <Link href="/diagnose">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="nav-diagnose">
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Diagnose
                </Button>
              </Link>
              <Link href="/history">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="nav-history">
                  <History className="w-4 h-4 mr-1.5" />
                  History
                </Button>
              </Link>
              <Link href="/knowledge">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="nav-knowledge">
                  <BookOpen className="w-4 h-4 mr-1.5" />
                  Knowledge
                </Button>
              </Link>
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none" data-testid="text-user-name">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground" data-testid="text-user-email">
                    {user.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              {user.companyName && (
                <>
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground">Business</p>
                    <p className="text-sm font-medium" data-testid="text-company">{user.companyName}</p>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <div className="sm:hidden">
                <Link href="/diagnose">
                  <DropdownMenuItem className="cursor-pointer" data-testid="mobile-nav-diagnose">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>New Diagnosis</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/history">
                  <DropdownMenuItem className="cursor-pointer" data-testid="mobile-nav-history">
                    <History className="mr-2 h-4 w-4" />
                    <span>History</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/knowledge">
                  <DropdownMenuItem className="cursor-pointer" data-testid="mobile-nav-knowledge">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Knowledge Base</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer" data-testid="button-logout">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
