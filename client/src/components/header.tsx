import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  MessageSquareText, 
  Network, 
  LogIn, 
  LogOut, 
  Settings, 
  Database, 
  ChevronDown 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <header className="bg-background shadow-sm border-b border-border">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center">
          <Brain className="text-primary mr-2 h-6 w-6" />
          <Link href="/" className="no-underline">
            <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer">
              Ipê Mind Tree
            </h1>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-8 items-center">
          <Link href="/" className={`${location === "/" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium`}>
            Home
          </Link>
          <Link href="/chat" className={`${location === "/chat" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium flex items-center`}>
            <MessageSquareText className="h-4 w-4 mr-1" />
            Chat
          </Link>
          <Link href="/explore" className={`${location === "/explore" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium`}>
            Explore
          </Link>
          <Link href="/obsidian" className={`${location === "/obsidian" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium flex items-center`}>
            <Network className="h-4 w-4 mr-1" />
            Obsidian
          </Link>
          <Link href="/about" className={`${location === "/about" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium`}>
            About
          </Link>
{user ? (
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <span className="text-foreground font-medium">Hello, {user.username}</span>
              </div>
              {user?.role === 'ADMIN' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={`${location.startsWith("/admin") ? "text-primary" : "text-foreground hover:text-primary"} font-medium flex items-center p-2`}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Admin
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Administration</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" asChild>
                      <Link href="/admin/subprompts" className="no-underline flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        Subprompts
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" asChild>
                      <Link href="/admin/database" className="no-underline flex items-center">
                        <Database className="h-4 w-4 mr-2" />
                        Database
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                disabled={logoutMutation.isPending}
                className="flex items-center space-x-1"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Logout</span>
              </Button>
            </div>
          ) : (
            <Button asChild className="flex items-center space-x-1 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary-dark transition-colors">
              <Link href="/auth" className="no-underline">
                <LogIn className="h-4 w-4 mr-1" />
                <span>Login</span>
              </Link>
            </Button>
          )}
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden flex items-center text-foreground" 
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      {/* Mobile Navigation */}
      <div className={`${isMobileMenuOpen ? "block" : "hidden"} md:hidden bg-background px-4 py-2 shadow-inner border-t border-border`}>
        <nav className="flex flex-col space-y-3">
          <Link href="/" className={`${location === "/" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium py-2`}>
            Home
          </Link>
          <Link href="/chat" className={`${location === "/chat" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium py-2 flex items-center`}>
            <MessageSquareText className="h-4 w-4 mr-1" />
            Chat
          </Link>
          <Link href="/explore" className={`${location === "/explore" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium py-2`}>
            Explore
          </Link>
          <Link href="/obsidian" className={`${location === "/obsidian" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium py-2 flex items-center`}>
            <Network className="h-4 w-4 mr-1" />
            Obsidian
          </Link>
          <Link href="/about" className={`${location === "/about" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium py-2`}>
            About
          </Link>
{user ? (
            <>
              {user?.role === 'ADMIN' && (
                <>
                  <div className="font-medium text-muted-foreground py-1 text-sm">Admin Menu</div>
                  <Link href="/admin/subprompts" className={`${location === "/admin/subprompts" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium py-2 flex items-center ml-2`}>
                    <Settings className="h-4 w-4 mr-1" />
                    Subprompts
                  </Link>
                  <Link href="/admin/database" className={`${location === "/admin/database" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium py-2 flex items-center ml-2`}>
                    <Database className="h-4 w-4 mr-1" />
                    Database
                  </Link>
                </>
              )}
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                disabled={logoutMutation.isPending}
                className="flex items-center space-x-1 w-full justify-center"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <Button asChild className="flex items-center space-x-1 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary-dark transition-colors w-full justify-center">
              <Link href="/auth" className="no-underline">
                <LogIn className="h-4 w-4 mr-1" />
                <span>Login</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
