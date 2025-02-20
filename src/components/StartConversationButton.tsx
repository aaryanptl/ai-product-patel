"use client";

import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

interface StartConversationButtonProps {
  onClick: () => void;
}

export default function StartConversationButton({
  onClick,
}: StartConversationButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="w-full h-14 bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 text-emerald-400 hover:text-emerald-300 transition-colors"
    >
      <Mic className="w-5 h-5 mr-2" />
      Start Conversation
    </Button>
  );
}
