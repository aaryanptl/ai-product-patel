import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userAudio } = await req.json();

    if (!userAudio) {
      return NextResponse.json(
        { error: "No user audio data provided" },
        { status: 400 }
      );
    }

    // Check if the userAudio is already a base64 string
    // If it starts with "data:" prefix, extract the actual base64 content
    let base64Data = userAudio;
    if (userAudio.startsWith("data:")) {
      const parts = userAudio.split(",");
      if (parts.length === 2) {
        base64Data = parts[1];
      }
    }

    // Decode the base64 audio data
    const audioBuffer = Buffer.from(base64Data, "base64");

    // Create a Blob from the binary data
    const audioBlob = new Blob([audioBuffer], { type: "audio/mp3" });

    // Create a File object from the Blob (Groq API handles File objects better)
    const audioFile = new File([audioBlob], "audio.mp3", { type: "audio/mp3" });

    // Create and populate FormData
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("response_format", "json");
    formData.append("language", "en");
    formData.append("temperature", "0");

    console.log("Sending request to Groq Whisper API...");

    // Call Groq API
    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Groq Whisper API error: ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    console.log("Groq Whisper transcription successful:", { text: data.text });
    const transcription = data.text;

    return NextResponse.json({
      transcription,
      speaker: "Human",
    });
  } catch (error) {
    console.error("Error transcribing audio with Groq Whisper:", error);
    return NextResponse.json(
      {
        error: "Failed to transcribe audio with Groq Whisper",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
