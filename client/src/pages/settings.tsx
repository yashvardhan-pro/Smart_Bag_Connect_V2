import { useBluetooth } from "@/hooks/use-bluetooth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Bluetooth, Volume2, Shield, Info, LogOut } from "lucide-react";

interface SettingsPageProps {
  bluetooth: ReturnType<typeof useBluetooth>;
}

export default function SettingsPage({ bluetooth }: SettingsPageProps) {
  return (
    <div className="pt-2 pb-24 space-y-6">
      <h2 className="text-2xl font-bold mb-6">System Settings</h2>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider ml-1">Connectivity</h3>
        <Card className="p-4 rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <Bluetooth className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold">Connection State</span>
                <span className="text-xs text-muted-foreground capitalize">{bluetooth.status}</span>
              </div>
            </div>
            {bluetooth.status === "connected" ? (
              <Button variant="destructive" size="sm" onClick={bluetooth.disconnect}>Disconnect</Button>
            ) : (
              <Button size="sm" onClick={bluetooth.connect} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Connect
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground bg-background/50 p-3 rounded-xl font-mono">
            UUID: 0000ffe0-0000-1000-8000-00805f9b34fb
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider ml-1">Alert Preferences</h3>
        <Card className="p-4 rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg text-destructive">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold">Intrusion Monitor</span>
                <span className="text-xs text-muted-foreground">Auto-detect lock tampering</span>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="space-y-3">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Volume2 className="w-4 h-4 text-muted-foreground" />
                 <Label className="text-sm">Alarm Volume</Label>
               </div>
               <span className="text-xs font-mono text-muted-foreground">100%</span>
             </div>
             <Slider defaultValue={[100]} max={100} step={1} className="w-full" />
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider ml-1">About</h3>
        <Card className="p-4 rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm">
           <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-500/10 rounded-lg text-slate-500">
                <Info className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold">Smart Bag OS v1.0.4</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Developed for Arduino-integrated smart backpacks. 
                  Handles BLE communication via HM-10 module.
                </p>
              </div>
           </div>
        </Card>
      </section>

      <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
        <LogOut className="w-4 h-4 mr-2" />
        Reset Application Data
      </Button>
    </div>
  );
}
