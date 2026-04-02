import { Badge } from "@/components/ui/badge";
import { LeadStatus, STATUS_MAP } from "@/types/lead";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, color } = STATUS_MAP[status] || { label: status, color: "bg-gray-100 text-gray-800" };

  return (
    <Badge variant="outline" className={cn("font-medium", color, className)}>
      {label}
    </Badge>
  );
}
