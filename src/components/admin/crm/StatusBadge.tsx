import { Badge } from "@/components/ui/badge";
import { getStatusDef, type ConversationStatus, CONVERSATION_STATUSES } from "@/lib/crmMetadataStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StatusBadgeProps {
  status: ConversationStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const def = getStatusDef(status);
  return (
    <Badge
      variant="outline"
      className={`${def.color} border ${size === "sm" ? "text-[9px] px-1.5 py-0" : "text-xs px-2 py-0.5"} font-medium`}
    >
      {def.label}
    </Badge>
  );
}

interface StatusSelectProps {
  value: ConversationStatus;
  onChange: (v: ConversationStatus) => void;
  compact?: boolean;
}

export function StatusSelect({ value, onChange, compact }: StatusSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ConversationStatus)}>
      <SelectTrigger className={compact ? "h-7 text-[11px] w-auto min-w-[130px]" : "h-8 text-xs"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONVERSATION_STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value} className="text-xs">
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${s.color.split(' ')[0]}`} />
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
