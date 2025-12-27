import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "default" | "lg";
  className?: string;
  showGlow?: boolean;
}

export function Logo({ size = "default", className, showGlow = false }: LogoProps) {
  const sizes = {
    sm: { width: 120, height: 60 },
    default: { width: 200, height: 100 },
    lg: { width: 280, height: 140 },
  };

  const { width, height } = sizes[size];

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {showGlow && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse,rgba(196,206,228,0.15)_0%,transparent_70%)] blur-xl pointer-events-none"
          aria-hidden="true"
        />
      )}
      <Image
        src="/logo.png"
        alt="Cinematch"
        width={width}
        height={height}
        className="relative z-10 object-contain"
        priority
      />
    </div>
  );
}
