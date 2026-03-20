import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CRM_TAGS, getTagDef, type CRMTag } from "@/lib/crmMetadataStore";
import { Tag, Plus, X } from "lucide-react";

interface TagBadgesProps {
  tags: CRMTag[];
  max?: number;
  size?: "sm" | "md";
}

export function TagBadges({ tags, max = 3, size = "sm" }: TagBadgesProps) {
  if (!tags.length) return null;
  const shown = tags.slice(0, max);
  const rest = tags.length - max;
  return (
    <div className="flex flex-wrap gap-0.5">
      {shown.map((t) => {
        const def = getTagDef(t);
        return (
          <Badge
            key={t}
            variant="outline"
            className={`${def.color} border ${size === "sm" ? "text-[8px] px-1 py-0 leading-tight" : "text-[10px] px-1.5 py-0"} font-medium`}
          >
            {def.label}
          </Badge>
        );
      })}
      {rest > 0 && (
        <Badge variant="outline" className={`${size === "sm" ? "text-[8px] px-1 py-0" : "text-[10px] px-1.5 py-0"} text-muted-foreground`}>
          +{rest}
        </Badge>
      )}
    </div>
  );
}

interface TagEditorProps {
  tags: CRMTag[];
  onToggle: (tag: CRMTag) => void;
  compact?: boolean;
}

export function TagEditor({ tags, onToggle, compact }: TagEditorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={compact ? "h-7 px-2 text-[11px]" : "h-8 px-3 text-xs"}>
          <Tag className="h-3 w-3 mr-1" />
          Tags{tags.length > 0 && ` (${tags.length})`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-[10px] font-medium text-muted-foreground mb-2 px-1">Toggle tags</p>
        <div className="flex flex-wrap gap-1">
          {CRM_TAGS.map((t) => {
            const active = tags.includes(t.value);
            return (
              <Badge
                key={t.value}
                variant="outline"
                className={`cursor-pointer text-[10px] px-2 py-0.5 transition-all ${
                  active ? `${t.color} border` : "text-muted-foreground border-border/50 opacity-60 hover:opacity-100"
                }`}
                onClick={() => onToggle(t.value)}
              >
                {active && <X className="h-2.5 w-2.5 mr-0.5" />}
                {t.label}
              </Badge>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
