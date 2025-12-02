
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import wiseLogo from "@/assets/icons/wise-logo.webp";

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
            EasyFlow
          </Link>
          
          <div className="flex items-center gap-2">
            <Button
              variant={isActive('/') ? 'default' : 'ghost'}
              size="sm"
              asChild
            >
              <Link to="/">בית</Link>
            </Button>
            <Button
              variant={isActive('/about') ? 'default' : 'ghost'}
              size="sm"
              asChild
            >
              <Link to="/about">אודות</Link>
            </Button>
            <Button
              variant={isActive('/contact') ? 'default' : 'ghost'}
              size="sm"
              asChild
            >
              <Link to="/contact">צור קשר</Link>
            </Button>
            <img 
              src={wiseLogo} 
              alt="Wise Logo" 
              className="h-8 w-auto ml-2"
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
