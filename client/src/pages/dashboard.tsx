import { useAlerts } from "@/hooks/use-alerts";
import { useBluetooth } from "@/hooks/use-bluetooth";
import { format } from "date-fns";
import { ShieldCheck, ShieldAlert, History, Activity, Bluetooth, RefreshCw, BatteryFull, BatteryMedium, BatteryLow, BatteryWarning } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

function BatteryIndicator({ level }: { level: number | null }) {
  const isUnknown = level === null;
  const pct = level ?? 0;

  const color =
    isUnknown ? "text-muted-foreground" :
    pct > 50  ? "text-green-400" :
    pct > 20  ? "text-yellow-400" :
                "text-red-400";

  const barColor =
    isUnknown ? "bg-muted-foreground/30" :
    pct > 50  ? "bg-green-400" :
    pct > 20  ? "bg-yellow-400" :
                "bg-red-400";

  const Icon =
    isUnknown || pct > 75 ? BatteryFull :
    pct > 40              ? BatteryMedium :
    pct > 15              ? BatteryLow :
                            BatteryWarning;

  return (
    <div className="bg-background/30 rounded-xl p-3 border border-white/5" data-testid="battery-indicator">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">Battery</div>
        <div className={`flex items-center gap-1 ${color}`}>
          <Icon className="w-4 h-4" />
          <span className="text-xl font-mono" data-testid="battery-level">
            {isUnknown ? "–%" : `${pct}%`}
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: isUnknown ? "0%" : `${pct}%` }}
        />
      </div>
      {!isUnknown && pct <= 20 && (
        <p className="text-[10px] text-red-400 mt-1 font-medium tracking-wide">LOW BATTERY</p>
      )}
    </div>
  );
}

interface DashboardProps {
  bluetooth: ReturnType<typeof useBluetooth>;
}

export default function Dashboard({ bluetooth }: DashboardProps) {
  const { data: alerts, isLoading, refetch } = useAlerts();

  const isConnected = bluetooth.status === "connected";

  return (
    <div className="space-y-6 pt-2 pb-20">
      {/* Hero Status Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card to-card/50 border border-border/50 p-6 shadow-xl">
        <div className="flex gap-2 mb-4 opacity-20 hover:opacity-100 transition-opacity absolute top-0 left-0 p-2 z-20">
          <button onClick={() => bluetooth.triggerAlarm?.("intrusion")} className="px-2 py-1 text-[10px] border rounded">T:I</button>
          <button onClick={() => bluetooth.triggerAlarm?.("water")} className="px-2 py-1 text-[10px] border rounded">T:W</button>
          <button onClick={() => bluetooth.triggerAlarm?.("override")} className="px-2 py-1 text-[10px] border rounded">T:O</button>
          <button onClick={() => bluetooth.triggerAlarm?.("surveillance")} className="px-2 py-1 text-[10px] border rounded">T:S</button>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity className="w-32 h-32" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">System Status</h2>
          <div className="flex items-center gap-3 mb-6">
            {isConnected ? (
              <>
                <ShieldCheck className="w-8 h-8 text-green-500" />
                <span className="text-3xl font-bold text-white tracking-tight">SECURE</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-8 h-8 text-yellow-500" />
                <span className="text-3xl font-bold text-white tracking-tight">OFFLINE</span>
              </>
            )}
          </div>

          {!isConnected && (
            <button
              onClick={bluetooth.connect}
              className="w-full py-3 px-4 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all active:scale-95"
            >
              <Bluetooth className="w-5 h-5" />
              Connect Smart Bag
            </button>
          )}

          {isConnected && (
            <div className="space-y-3">
              <BatteryIndicator level={bluetooth.batteryLevel} />
            </div>
          )}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Security Log
          </h3>
          <button onClick={() => refetch()} className="p-2 hover:bg-card rounded-full transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <ScrollArea className="h-[300px] rounded-2xl bg-card/30 border border-border/50 p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-card/50 rounded-xl animate-pulse" />)}
            </div>
          ) : alerts?.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-10">
               <ShieldCheck className="w-12 h-12 mb-3" />
               <p>No security incidents logged</p>
             </div>
          ) : (
            <div className="space-y-3">
              {alerts?.map((alert) => (
                <div key={alert.id} className="bg-card hover:bg-card/80 transition-colors p-4 rounded-xl border-l-4 border-destructive flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-foreground">{alert.message}</span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase bg-background/50 px-2 py-0.5 rounded">
                      {format(new Date(alert.receivedAt || new Date()), "HH:mm:ss")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between">
                     <span>{format(new Date(alert.receivedAt || new Date()), "MMM dd, yyyy")}</span>
                     {!alert.isRead && <span className="text-primary font-bold text-[10px] tracking-wider">NEW</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
