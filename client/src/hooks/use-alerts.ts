import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateAlertRequest } from "@shared/routes";

export function useAlerts() {
  return useQuery({
    queryKey: [api.alerts.list.path],
    queryFn: async () => {
      const res = await fetch(api.alerts.list.path);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return api.alerts.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll for alerts periodically as backup
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAlertRequest) => {
      const res = await fetch(api.alerts.create.path, {
        method: api.alerts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create alert log");
      return api.alerts.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
    },
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.alerts.markRead.path, { id });
      const res = await fetch(url, { method: api.alerts.markRead.method });
      if (!res.ok) throw new Error("Failed to mark alert as read");
      return api.alerts.markRead.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
    },
  });
}
