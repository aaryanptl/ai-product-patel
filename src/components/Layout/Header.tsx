"use client";

import Image from "next/image";
import Link from "next/link";
import { Zap } from "lucide-react";
import { Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "700", "500"],
});

export default function Header() {
  return (
    <header className="relative z-10 pt-8 pb-4 text-center items-center">
      <Link href="https://buildfastwithai.com">
        <Image
          src="/logo.svg"
          alt="Build Fast with AI"
          width={70}
          height={70}
          className="absolute left-10"
        />
      </Link>
      <div className="flex items-center justify-center gap-2 mb-1">
        <Zap className="w-8 h-8 text-emerald-400" />
        <h1
          className={cn(
            "text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400",
            spaceGrotesk.className
          )}
        >
          MEET PRODUCT PATEL
        </h1>
        <Zap className="w-8 h-8 text-emerald-400" />
      </div>
      <p
        className={cn(
          "text-emerald-400/90 text-lg tracking-widest font-medium uppercase",
          spaceGrotesk.className
        )}
      >
        The AI vs Human Roast Debate
      </p>
    </header>
  );
}
