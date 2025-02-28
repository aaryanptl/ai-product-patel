"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Share2, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createClient,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { Database, RealtimeVotePayload } from "@/types/supabase";

// Initialize Supabase client (will be configured with environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Define vote type
interface Vote {
  vote_for: "human" | "ai";
  [key: string]: any;
}

export default function AudiencePoll({ debateId = "current" }) {
  const router = useRouter();
  const [votes, setVotes] = useState({ human: 0, ai: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [currentDebateId, setCurrentDebateId] = useState<string>(
    typeof debateId === "string" ? debateId : ""
  );

  const totalVotes = votes.human + votes.ai;
  const getPercentage = (value: number) =>
    totalVotes === 0 ? 0 : (value / totalVotes) * 100;

  // Load votes from Supabase
  useEffect(() => {
    const fetchVotes = async () => {
      try {
        // First get the current debate ID if not already provided
        let debateIdToUse = currentDebateId;

        if (!debateIdToUse || debateIdToUse === "current") {
          const { data, error } = await supabase
            .from("rt_debates")
            .select("id")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (error) throw error;
          debateIdToUse = data?.id || "";
          setCurrentDebateId(debateIdToUse);
        }

        if (!debateIdToUse) {
          console.error("No debate ID found");
          setIsLoading(false);
          return;
        }

        // Set the share URL
        setShareUrl(`${window.location.origin}/vote/${debateIdToUse}`);

        // Get vote counts - use count aggregation correctly
        const { count: humanCount, error: humanError } = await supabase
          .from("rt_votes")
          .select("*", { count: "exact", head: true })
          .eq("debate_id", debateIdToUse)
          .eq("vote_for", "human");

        const { count: aiCount, error: aiError } = await supabase
          .from("rt_votes")
          .select("*", { count: "exact", head: true })
          .eq("debate_id", debateIdToUse)
          .eq("vote_for", "ai");

        if (humanError) throw humanError;
        if (aiError) throw aiError;

        setVotes({
          human: humanCount || 0,
          ai: aiCount || 0,
        });

        console.log(
          `Fetched votes: human=${humanCount}, ai=${aiCount} for debate ${debateIdToUse}`
        );
      } catch (error) {
        console.error("Error fetching votes:", error);
        // Reset votes to 0 in case of error
        setVotes({ human: 0, ai: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVotes();

    // Set up real-time subscription for votes
    const setupRealtime = async () => {
      let debateIdToUse = currentDebateId;

      if (!debateIdToUse || debateIdToUse === "current") {
        try {
          const { data, error } = await supabase
            .from("rt_debates")
            .select("id")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!error && data) {
            debateIdToUse = data.id;
            setCurrentDebateId(debateIdToUse);
          }
        } catch (error) {
          console.error("Error getting debate ID for realtime:", error);
          return;
        }
      }

      if (!debateIdToUse) return;

      const votesSubscription = supabase
        .channel(`votes-channel-${debateIdToUse}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "rt_votes",
            filter: `debate_id=eq.${debateIdToUse}`,
          },
          (payload) => {
            // Update vote count when new votes come in
            if (payload.eventType === "INSERT") {
              const voteData =
                payload.new as Database["public"]["Tables"]["rt_votes"]["Row"];

              console.log("New vote received:", voteData);

              if (voteData.vote_for === "human" || voteData.vote_for === "ai") {
                setVotes((prev) => {
                  const newVotes = {
                    ...prev,
                    [voteData.vote_for]: prev[voteData.vote_for] + 1,
                  };
                  console.log("Updated votes:", newVotes);
                  return newVotes;
                });
              }
            }
          }
        )
        .subscribe((status) => {
          console.log(`Realtime subscription status: ${status}`);
        });

      return votesSubscription;
    };

    const subscription = setupRealtime();

    return () => {
      if (subscription) {
        subscription.then((sub) => {
          if (sub) supabase.removeChannel(sub);
        });
      }
    };
  }, [debateId]);

  const handleShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleVoteClick = (voteFor: "human" | "ai") => {
    if (currentDebateId) {
      router.push(`/vote/${currentDebateId}?vote=${voteFor}`);
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl p-4 rounded-3xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg text-white font-semibold">Audience Poll</h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-gray-400 hover:text-white hover:bg-zinc-800"
          onClick={handleShareLink}
        >
          {copied ? (
            <span className="text-xs text-emerald-500">Copied!</span>
          ) : (
            <Share2 className="size-4" />
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 bg-zinc-800 rounded-lg" />
          <div className="h-12 bg-zinc-800 rounded-lg" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="h-10 bg-zinc-800 rounded-lg" />
            <div className="h-10 bg-zinc-800 rounded-lg" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative h-12">
            <div className="absolute bg-zinc-900 inset-0 rounded-lg" />
            <motion.div
              className="absolute inset-y-0 left-0 bg-sky-700 rounded-lg"
              initial={{ width: "0%" }}
              animate={{ width: `${getPercentage(votes.human)}%` }}
              transition={{ duration: 0.5 }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3">
              <span className="font-medium">Human PMs</span>
              <span>{getPercentage(votes.human).toFixed(1)}%</span>
            </div>
          </div>

          <div className="relative h-12">
            <div className="absolute inset-0 bg-zinc-900 rounded-lg" />
            <motion.div
              className="absolute inset-y-0 left-0 bg-teal-700 rounded-lg"
              initial={{ width: "0%" }}
              animate={{ width: `${getPercentage(votes.ai)}%` }}
              transition={{ duration: 0.5 }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3">
              <span className="font-medium">AI</span>
              <span>{getPercentage(votes.ai).toFixed(1)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button
              variant="outline"
              className="border-blue-500/50 hover:bg-sky-600"
              onClick={() => handleVoteClick("human")}
            >
              Vote Human
            </Button>
            <Button
              variant="outline"
              className="border-teal-500/50 hover:bg-teal-600"
              onClick={() => handleVoteClick("ai")}
            >
              Vote AI
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full text-gray-400 hover:text-white mt-2 text-sm flex items-center justify-center gap-1"
            onClick={() => window.open(shareUrl, "_blank")}
          >
            <ExternalLink className="size-3" />
            Open Voting Page
          </Button>
        </div>
      )}
    </Card>
  );
}
