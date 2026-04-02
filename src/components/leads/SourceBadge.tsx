import { Badge } from "@/components/ui/badge";
import { LeadSource, SOURCE_MAP } from "@/types/lead";
import { Globe, Camera, Phone, MousePointerClick, UserPlus } from "lucide-react";

interface SourceBadgeProps {
  source: LeadSource;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const label = SOURCE_MAP[source] || source;

  const Icon = () => {
    switch (source) {
      case "website":
        return <Globe className="h-3 w-3 mr-1" />;
      case "tiktok":
        return <MousePointerClick className="h-3 w-3 mr-1" />;
      case "instagram":
        return <Camera className="h-3 w-3 mr-1" />;
      case "phone":
        return <Phone className="h-3 w-3 mr-1" />;
      case "manual":
        return <UserPlus className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <Badge variant="secondary" className="font-normal text-xs bg-gray-100 text-gray-600 hover:bg-gray-200">
      <Icon />
      {label}
    </Badge>
  );
}
