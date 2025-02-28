import { NextResponse } from "next/server";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { userAudio, aiAudio, transcript } = await req.json();

    if (!userAudio && !aiAudio) {
      return NextResponse.json(
        { error: "No audio data provided" },
        { status: 400 }
      );
    }

    const model = googleAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const parts: Part[] = [];

    // Add transcript context if available
    if (transcript && transcript.length > 0) {
      const recentTranscript = transcript.slice(-4); // Get last 4 entries (2 pairs max)
      const formattedTranscript = recentTranscript
        .map((item: any) => `${item.speaker}: ${item.text}`)
        .join("\n");

      parts.push({
        text: `Here is the recent transcript of the conversation:\n${formattedTranscript}`,
      });
    }

    // Add user audio if available
    if (userAudio) {
      parts.push({
        inlineData: {
          mimeType: "audio/mp3", // Adjust based on actual format
          data: userAudio,
        },
      });
      parts.push({ text: "Above is the most recent human speech." });
    }

    // Add AI audio if available
    if (aiAudio) {
      parts.push({
        inlineData: {
          mimeType: "audio/mp3", // Adjust based on actual format
          data: aiAudio,
        },
      });
      parts.push({ text: "Above is the most recent AI response." });
    }

    // Add the analysis prompt
    parts.push({
      text: "Please provide a brief analysis of this conversation exchange. Focus on tone, key points made by both parties, and the overall direction of the discussion. Keep your response concise (2-3 sentences).",
    });

    const result = await model.generateContent(parts);
    const analysis = result.response.text();

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error analyzing audio:", error);
    return NextResponse.json(
      { error: "Failed to analyze audio", details: (error as Error).message },
      { status: 500 }
    );
  }
}
