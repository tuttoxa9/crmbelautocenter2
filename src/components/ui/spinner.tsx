import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loader2 className={cn("animate-spin text-current", className)} {...props} />
  );
}
