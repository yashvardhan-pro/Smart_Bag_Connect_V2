import { useState } from "react";
import { useTimetables, useUpdateTimetable } from "@/hooks/use-timetables";
import { useBluetooth } from "@/hooks/use-bluetooth";
import { SubjectList } from "@/components/subject-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TimetablePageProps {
  bluetooth: ReturnType<typeof useBluetooth>;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TimetablePage({ bluetooth }: TimetablePageProps) {
  const [activeDay, setActiveDay] = useState(DAYS[0]);
  const { data: timetables, isLoading } = useTimetables();
  const updateTimetable = useUpdateTimetable();
  const { toast } = useToast();

  const currentSubjects = timetables?.find(t => t.day === activeDay)?.subjects || [];

  const handleSave = async (subjects: string[]) => {
    try {
      await updateTimetable.mutateAsync({ day: activeDay, subjects });
      // toast handled by mutation logic ideally, but nice to confirm specific action
    } catch (e) {
      toast({ title: "Error", description: "Failed to save schedule.", variant: "destructive" });
    }
  };

  const handleSync = async () => {
    if (bluetooth.status !== "connected") {
      toast({ title: "Not Connected", description: "Connect to bag to sync.", variant: "destructive" });
      return;
    }
    
    // Format: "DAY:MON,SUB:Math,Eng"
    // Shorten day to 3 chars
    const shortDay = activeDay.substring(0, 3).toUpperCase();
    const subString = currentSubjects.join(",");
    const payload = `DAY:${shortDay},SUB:${subString}`;
    
    await bluetooth.sendData(payload);
  };

  return (
    <div className="pt-2 pb-24 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Timetable</h2>
          <p className="text-muted-foreground text-sm">Manage daily schedules</p>
        </div>
        <Button 
          onClick={handleSync}
          disabled={bluetooth.status !== "connected" || currentSubjects.length === 0}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Send className="w-4 h-4 mr-2" />
          Sync Day
        </Button>
      </div>

      <Tabs defaultValue={DAYS[0]} value={activeDay} onValueChange={setActiveDay} className="w-full flex-1 flex flex-col">
        <ScrollableTabsList days={DAYS} />
        
        <div className="mt-6 flex-1 bg-card/30 border border-border/50 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <SubjectList 
              subjects={currentSubjects}
              onChange={handleSave}
              isLoading={updateTimetable.isPending}
            />
          )}

          {updateTimetable.isPending && (
             <div className="absolute top-4 right-4">
               <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
             </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}

function ScrollableTabsList({ days }: { days: string[] }) {
  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      <TabsList className="h-auto bg-transparent p-0 gap-2 inline-flex">
        {days.map((day) => (
          <TabsTrigger
            key={day}
            value={day}
            className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-card border border-border/50 text-muted-foreground font-medium transition-all duration-300"
          >
            {day.substring(0, 3)}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}
