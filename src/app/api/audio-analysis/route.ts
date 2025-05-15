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

    // Debug log the incoming audio data format
    console.log("Received audio data format:", {
      isString: typeof userAudio === "string",
      length: userAudio.length,
      startsWithData: userAudio.startsWith("data:"),
      mimeType: userAudio.split(";")[0].split(":")[1],
    });

    // Extract the base64 data and validate MIME type
    if (!userAudio.startsWith("data:audio/")) {
      return NextResponse.json(
        { error: "Invalid audio format - must be audio MIME type" },
        { status: 400 }
      );
    }

    // Extract the base64 data
    const base64Data = userAudio.split("base64,")[1];
    if (!base64Data) {
      return NextResponse.json(
        { error: "Invalid base64 audio data format" },
        { status: 400 }
      );
    }

    // Decode the base64 audio data
    const audioBuffer = Buffer.from(base64Data, "base64");
    console.log("Audio buffer size:", audioBuffer.length, "bytes");

    if (audioBuffer.length < 100) {
      return NextResponse.json(
        { error: "Audio data too small to be valid" },
        { status: 400 }
      );
    }

    // Create a Blob from the binary data
    const audioBlob = new Blob([audioBuffer], { type: "audio/wav" });
    console.log("Created Blob size:", audioBlob.size, "bytes");

    // Create a File object from the Blob
    const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });
    console.log("Created File size:", audioFile.size, "bytes");

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
      console.error("Groq API error response:", errorData);
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
