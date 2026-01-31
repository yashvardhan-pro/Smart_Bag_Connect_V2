import { Plus, X, GripVertical } from "lucide-react";
import { motion, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface SubjectListProps {
  subjects: string[];
  onChange: (subjects: string[]) => void;
  isLoading?: boolean;
}

export function SubjectList({ subjects, onChange, isLoading }: SubjectListProps) {
  const [newSubject, setNewSubject] = useState("");

  const handleAdd = () => {
    if (!newSubject.trim()) return;
    onChange([...subjects, newSubject.trim()]);
    setNewSubject("");
  };

  const handleRemove = (index: number) => {
    const next = [...subjects];
    next.splice(index, 1);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {subjects.map((subject, idx) => (
          <motion.div 
            key={`${subject}-${idx}`}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-card/50 border border-border/50 p-3 rounded-xl group hover:border-primary/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold font-mono">
              {idx + 1}
            </div>
            <span className="flex-1 font-medium">{subject}</span>
            <button 
              onClick={() => handleRemove(idx)}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors opacity-50 group-hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
        
        {subjects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground italic border border-dashed border-border rounded-xl">
            No subjects scheduled for this day
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add subject (e.g. Mathematics)"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="h-12 bg-card/50 border-border/50 focus:border-primary/50"
        />
        <Button 
          onClick={handleAdd}
          disabled={!newSubject.trim() || isLoading}
          className="h-12 w-12 p-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
