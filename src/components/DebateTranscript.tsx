"use client";

import { Activity, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DebateTranscriptProps {
  transcript: Array<{
    text: string;
    speaker: "AI" | "Human";
    timestamp?: number;
  }>;
  debateSummary: string;
  isLoadingSummary: boolean;
  isTransitioning: boolean;
  isAudioPlaying: boolean;
  fetchSummary: () => Promise<void>;
  setSessionStatus: (status: string) => void;
}

export default function DebateTranscript({
  transcript,
  debateSummary,
  isLoadingSummary,
  isTransitioning,
  isAudioPlaying,
  fetchSummary,
  setSessionStatus,
}: DebateTranscriptProps) {
  const handleRefreshClick = async () => {
    if (transcript.length < 2) return;

    // Don't update while audio is still playing
    if (isAudioPlaying) {
      // Provide visual feedback that we're waiting for audio to complete
      setSessionStatus("Waiting for audio to complete...");
      setTimeout(() => setSessionStatus(""), 2000);
      return;
    }

    await fetchSummary();
  };

  return (
    <div className="border border-emerald-500/30 rounded-2xl bg-black/40 backdrop-blur-sm overflow-hidden">
      <div className="p-4 border-b border-emerald-500/30 flex justify-between items-center">
        <h2 className="font-semibold text-emerald-100 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-emerald-400" />
          Debate Transcript
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-emerald-400 h-8 w-8"
          onClick={handleRefreshClick}
        >
          {isLoadingSummary ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {/* Debate Summary */}
        <div>
          <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/20">
            <p
              className={`text-sm text-emerald-100/80 transition-opacity duration-300 ${
                isTransitioning ? "opacity-30" : "opacity-100"
              }`}
            >
              {isLoadingSummary && !debateSummary ? (
                <span className="flex items-center">
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Generating summary...
                </span>
              ) : (
                debateSummary
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
