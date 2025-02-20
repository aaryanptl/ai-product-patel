import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import { getAudioBuffer } from "@/lib/utils";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    // Generate audio using Deepgram

    const response = await deepgram.speak.request(
      { text },
      {
        model: "aura-luna-en",
        encoding: "linear16",
        container: "wav",
      }
    );

    const stream = await response.getStream();

    if (!stream) {
      console.log("Failed to generate audio stream");
      throw new Error("Failed to generate audio stream");
    }

    const buffer = await getAudioBuffer(stream);

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/wav",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process voice input" },
      { status: 500 }
    );
  }
}
