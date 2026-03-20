import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StickyNote } from "lucide-react";

interface NotesEditorProps {
  notes: string;
  onChange: (notes: string) => void;
  compact?: boolean;
}

export function NotesEditor({ notes, onChange, compact }: NotesEditorProps) {
  const [draft, setDraft] = useState(notes);
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(notes); }, [notes]);

  const save = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setTimeout(() => textareaRef.current?.focus(), 50); }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`${compact ? "h-7 px-2 text-[11px]" : "h-8 px-3 text-xs"} ${notes ? "text-amber-400" : ""}`}
        >
          <StickyNote className="h-3 w-3 mr-1" />
          {notes ? "Notes" : "Add Note"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Notes</p>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[80px] text-xs bg-background border border-border rounded-md p-2 resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Add notes about this conversation or customer..."
        />
        <div className="flex justify-end gap-1.5 mt-2">
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setOpen(false); setDraft(notes); }}>Cancel</Button>
          <Button size="sm" className="h-6 text-[10px]" onClick={save}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface NotesIndicatorProps {
  hasNotes: boolean;
}

export function NotesIndicator({ hasNotes }: NotesIndicatorProps) {
  if (!hasNotes) return null;
  return <StickyNote className="h-3 w-3 text-amber-400/80 flex-shrink-0" />;
}
