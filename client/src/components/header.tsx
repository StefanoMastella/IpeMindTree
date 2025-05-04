import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquareText, Braces } from "lucide-react";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
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
            <Braces className="h-4 w-4 mr-1" />
            Obsidian
          </Link>
          <Link href="/about" className={`${location === "/about" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium`}>
            About
          </Link>
          <Button className="flex items-center space-x-1 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary-dark transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Sign In</span>
          </Button>
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
            <Braces className="h-4 w-4 mr-1" />
            Obsidian
          </Link>
          <Link href="/about" className={`${location === "/about" ? "text-primary" : "text-foreground hover:text-primary transition-colors"} font-medium py-2`}>
            About
          </Link>
          <Button className="flex items-center space-x-1 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary-dark transition-colors w-full justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Sign In</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
