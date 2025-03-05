"use client";

import { Activity, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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
  isDarkMode?: boolean;
}

export default function DebateTranscript({
  transcript,
  debateSummary,
  isLoadingSummary,
  isTransitioning,
  isAudioPlaying,
  fetchSummary,
  setSessionStatus,
  isDarkMode = false,
}: DebateTranscriptProps) {
  // Add state to track if we're waiting for audio to complete
  const [isWaitingForAudio, setIsWaitingForAudio] = useState(false);

  const handleRefreshClick = async () => {
    if (transcript.length < 2) return;

    // Don't start a new check if we're already waiting
    if (isWaitingForAudio) {
      setSessionStatus("Already waiting for audio to complete...");
      setTimeout(() => setSessionStatus(""), 2000);
      return;
    }

    // Don't update while audio is still playing
    if (isAudioPlaying) {
      // Provide visual feedback that we're waiting for audio to complete
      setSessionStatus("Waiting for audio to complete...");

      // Flag that we're now waiting for audio
      setIsWaitingForAudio(true);

      // Instead of just showing a message, create a waiting mechanism
      // that will trigger the summary when audio completes
      const checkAudioStatus = () => {
        // Create a local reference to avoid closure issues
        if (!isWaitingForAudio) return; // Exit if we're no longer waiting

        if (isAudioPlaying) {
          // If still playing, check again after a short delay
          setTimeout(checkAudioStatus, 500);
        } else {
          // Audio has finished, now we can generate the summary
          // Set a flag to prevent further execution of this function
          setIsWaitingForAudio(false);

          setSessionStatus("Generating summary...");
          fetchSummary()
            .then(() => {
              setSessionStatus("Summary updated!");
              setTimeout(() => setSessionStatus(""), 2000);
            })
            .catch(() => {
              setSessionStatus("Failed to update summary");
              setTimeout(() => setSessionStatus(""), 2000);
            });
        }
      };

      // Start checking for audio completion
      checkAudioStatus();
      return;
    }

    // If audio is not playing, generate summary immediately
    setSessionStatus("Generating summary...");
    await fetchSummary();
    setSessionStatus("Summary updated!");
    setTimeout(() => setSessionStatus(""), 2000);
  };

  return (
    <div
      className={`rounded-2xl h-full shadow-lg overflow-hidden transition-all duration-300 ${
        isDarkMode
          ? "bg-gray-800 border border-emerald-500/30 shadow-emerald-900/20"
          : "bg-white border border-gray-200 shadow-gray-200/60"
      }`}
    >
      <div
        className={`p-4 flex justify-between items-center ${
          isDarkMode
            ? "border-b border-emerald-500/30"
            : "border-b border-gray-200"
        }`}
      >
        <h2
          className={`font-semibold flex items-center ${
            isDarkMode ? "text-emerald-100" : "text-gray-800"
          }`}
        >
          <Activity
            className={`w-5 h-5 mr-2 ${
              isDarkMode ? "text-emerald-400" : "text-emerald-600"
            }`}
          />
          Debate Transcript
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${
            isDarkMode ? "text-emerald-400" : "text-emerald-600"
          }`}
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
          <div
            className={`p-3 rounded-lg ${
              isDarkMode
                ? "bg-emerald-900/20 border border-emerald-500/20"
                : "bg-emerald-50 border border-emerald-200"
            }`}
          >
            <p
              className={`text-sm transition-opacity duration-300 ${
                isTransitioning ? "opacity-30" : "opacity-100"
              } ${isDarkMode ? "text-emerald-100/80" : "text-gray-700"}`}
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
