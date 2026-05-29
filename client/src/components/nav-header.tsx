import { Link, useLocation } from "wouter";
import { Battery, Bluetooth, LayoutDashboard, Calendar, Settings, Bell, MapPin, Loader2 } from "lucide-react";
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

interface BottomNavProps {
  status: "disconnected" | "connecting" | "connected" | "error";
  onConnect: () => void;
  onDisconnect: () => void;
}

export function BottomNav({ status, onConnect, onDisconnect }: BottomNavProps) {
  const [location] = useLocation();

  const leftLinks = [
    { href: "/", icon: LayoutDashboard, label: "Dash" },
    { href: "/timetable", icon: Calendar, label: "Meetings" },
  ];

  const rightLinks = [
    { href: "/location", icon: MapPin, label: "Location" },
    { href: "/alerts", icon: Bell, label: "Alerts" },
  ];

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  const handleBtPress = () => {
    if (isConnected) onDisconnect();
    else if (!isConnecting) onConnect();
  };

  const fabColor = isConnected
    ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.45)]"
    : isConnecting
    ? "bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.45)]"
    : status === "error"
    ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.45)]"
    : "bg-primary shadow-[0_0_20px_rgba(6,182,212,0.45)]";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border/50 pb-safe">
      <div className="max-w-md mx-auto h-16 flex items-center px-2">
        {/* Left links */}
        {leftLinks.map((link) => {
          const isActive = location === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 relative overflow-hidden",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`nav-link-${link.label.toLowerCase()}`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary blur-[2px]" />
              )}
              <link.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
              <span className="text-[10px] font-medium tracking-wider uppercase">{link.label}</span>
            </Link>
          );
        })}

        {/* Center BT FAB */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 w-20">
          <button
            onClick={handleBtPress}
            disabled={isConnecting}
            data-testid="button-bt-connect"
            className={cn(
              "w-14 h-14 -mt-6 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 border-4 border-background",
              fabColor,
              isConnecting && "cursor-not-allowed"
            )}
          >
            {isConnecting ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Bluetooth className="w-6 h-6 text-white" />
            )}
          </button>
          <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5 text-muted-foreground">
            {isConnected ? "ON" : isConnecting ? "…" : "OFF"}
          </span>
        </div>

        {/* Right links */}
        {rightLinks.map((link) => {
          const isActive = location === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 relative overflow-hidden",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`nav-link-${link.label.toLowerCase()}`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary blur-[2px]" />
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
