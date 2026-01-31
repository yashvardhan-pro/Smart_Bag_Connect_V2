import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type UpdateTimetableRequest } from "@shared/routes";

export function useTimetables() {
  return useQuery({
    queryKey: [api.timetables.list.path],
    queryFn: async () => {
      const res = await fetch(api.timetables.list.path);
      if (!res.ok) throw new Error("Failed to fetch timetables");
      return api.timetables.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateTimetable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateTimetableRequest) => {
      const res = await fetch(api.timetables.update.path, {
        method: api.timetables.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update timetable");
      return api.timetables.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.timetables.list.path] });
    },
  });
}
