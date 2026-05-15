import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Bell, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Alert } from "@shared/schema";

export default function AlertsPage() {
  const { toast } = useToast();
  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: [api.alerts.list.path],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.alerts.markRead.path, { id }), {
        method: api.alerts.markRead.method,
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full bg-card animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const unreadCount = alerts?.filter(a => !a.isRead).length || 0;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Security Log</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount} unread intrusion alerts
          </p>
        </div>
        <Bell className="w-6 h-6 text-primary animate-pulse" />
      </div>

      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-4">
          {alerts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium">All Clear</h3>
                <p className="text-sm text-muted-foreground">No intrusion alerts recorded.</p>
              </div>
            </div>
          ) : (
            alerts?.map((alert) => (
              <Card 
                key={alert.id} 
                className={`transition-all duration-300 ${!alert.isRead ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/5' : 'opacity-80'}`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`mt-1 p-2 rounded-full ${!alert.isRead ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">
                        {alert.receivedAt ? format(new Date(alert.receivedAt), "MMM d, HH:mm:ss") : "—"}
                      </span>
                      {!alert.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm font-medium leading-relaxed">
                      {alert.message}
                    </p>
                    {!alert.isRead && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-[10px] uppercase tracking-wider"
                        onClick={() => markReadMutation.mutate(alert.id)}
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
