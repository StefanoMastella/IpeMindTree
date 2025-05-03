import { Link, useLocation } from "wouter";
import { Home, Compass, MessageSquare, Info, User } from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black shadow-lg border-t border-gray-800 z-10">
      <div className="flex justify-around py-2">
        <Link href="/">
          <a className={`flex flex-col items-center px-4 py-2 ${location === "/" ? "text-primary border-b-2 border-primary" : "text-white hover:text-primary transition-colors"}`}>
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </a>
        </Link>
        
        <Link href="/explore">
          <a className={`flex flex-col items-center px-4 py-2 ${location === "/explore" ? "text-primary border-b-2 border-primary" : "text-white hover:text-primary transition-colors"}`}>
            <Compass className="h-5 w-5" />
            <span className="text-xs">Explore</span>
          </a>
        </Link>
        
        <Link href="/chat">
          <a className={`flex flex-col items-center px-4 py-2 ${location === "/chat" ? "text-primary border-b-2 border-primary" : "text-white hover:text-primary transition-colors"}`}>
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">Chat</span>
          </a>
        </Link>
        
        <Link href="/about">
          <a className={`flex flex-col items-center px-4 py-2 ${location === "/about" ? "text-primary border-b-2 border-primary" : "text-white hover:text-primary transition-colors"}`}>
            <Info className="h-5 w-5" />
            <span className="text-xs">About</span>
          </a>
        </Link>
      </div>
    </div>
  );
}
