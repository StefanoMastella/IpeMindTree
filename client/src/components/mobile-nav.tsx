import { Link, useLocation } from "wouter";
import { Home, Compass, Bell, User } from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-10">
      <div className="flex justify-around py-2">
        <Link href="/">
          <a className={`flex flex-col items-center px-4 py-2 ${location === "/" ? "text-primary" : "text-secondary hover:text-primary transition-colors"}`}>
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </a>
        </Link>
        
        <Link href="/explore">
          <a className={`flex flex-col items-center px-4 py-2 ${location === "/explore" ? "text-primary" : "text-secondary hover:text-primary transition-colors"}`}>
            <Compass className="h-5 w-5" />
            <span className="text-xs">Explore</span>
          </a>
        </Link>
        
        <Link href="/notifications">
          <a className={`flex flex-col items-center px-4 py-2 ${location === "/notifications" ? "text-primary" : "text-secondary hover:text-primary transition-colors"}`}>
            <Bell className="h-5 w-5" />
            <span className="text-xs">Alerts</span>
          </a>
        </Link>
        
        <Link href="/profile">
          <a className={`flex flex-col items-center px-4 py-2 ${location === "/profile" ? "text-primary" : "text-secondary hover:text-primary transition-colors"}`}>
            <User className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </a>
        </Link>
      </div>
    </div>
  );
}
