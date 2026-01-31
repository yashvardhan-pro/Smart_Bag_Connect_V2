import { Link, useLocation } from "wouter";
import { Battery, Bluetooth, LayoutDashboard, Calendar, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavHeaderProps {
  status: "disconnected" | "connecting" | "connected" | "error";
  onConnect: () => void;
  onDisconnect: () => void;
}

export function NavHeader({ status, onConnect, onDisconnect }: NavHeaderProps) {
  const [location] = useLocation();

  const getStatusColor = () => {
    switch(status) {
      case "connected": return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]";
      case "connecting": return "bg-yellow-500 animate-pulse";
      case "error": return "bg-red-500";
      default: return "bg-slate-600";
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
        <h1 className="text-xl tracking-widest bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-bold">
          SMARTBAG<span className="text-xs align-top opacity-70">OS</span>
        </h1>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/50 shadow-sm">
             <div className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500", getStatusColor())} />
             <span className="text-xs font-mono font-medium uppercase text-muted-foreground hidden sm:block">
               {status}
             </span>
             {status === 'connected' ? (
                <button onClick={onDisconnect} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                  <Bluetooth className="w-4 h-4" />
                </button>
             ) : (
                <button onClick={onConnect} className="text-xs text-primary hover:text-primary/80 transition-colors animate-pulse">
                  <Bluetooth className="w-4 h-4" />
                </button>
             )}
          </div>
          {/* Decorative Battery Icon - assuming we don't have real battery level yet */}
          <Battery className="w-5 h-5 text-muted-foreground opacity-50" />
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const [location] = useLocation();
  
  const links = [
    { href: "/", icon: LayoutDashboard, label: "Dash" },
    { href: "/timetable", icon: Calendar, label: "Schedule" },
    { href: "/alerts", icon: Bell, label: "Alerts" },
    { href: "/settings", icon: Settings, label: "System" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border/50 pb-safe">
      <div className="max-w-md mx-auto h-16 flex items-center justify-around px-2">
        {links.map((link) => {
          const isActive = location === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 relative overflow-hidden group",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary blur-[2px]" />
              )}
              <link.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
              <span className="text-[10px] font-medium tracking-wider uppercase">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
