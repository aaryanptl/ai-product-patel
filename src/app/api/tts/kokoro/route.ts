import { NextResponse } from "next/server";

const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;
const KOKORO_API_URL =
  "https://api.deepinfra.com/v1/inference/hexgrad/Kokoro-82M";

export async function POST(req: Request) {
  try {
    const {
      text,
      outputFormat = "wav",
      voice = ["af_bella"],
      speed,
    } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const deepInfraResponse = await fetch(KOKORO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPINFRA_API_KEY}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        text,
        output_format: outputFormat,
        preset_voice: voice,
        ...(speed && { speed }),
      }),
    });

    if (!deepInfraResponse.ok) {
      const errorData = await deepInfraResponse.json();
      throw new Error(errorData.message || "DeepInfra API request failed");
    }

    const result = await deepInfraResponse.json();

    if (!result.audio) {
      throw new Error("No audio data received from DeepInfra");
    }

    // Check inference status
    if (result.inference_status?.status !== "succeeded") {
      throw new Error(
        `Inference failed with status: ${result.inference_status?.status}`
      );
    }

    // Decode base64 to binary
    const audioData = Buffer.from(result.audio, "base64");

    // For WAV format, ensure proper WAV header
    if (outputFormat === "wav") {
      // Check if WAV header is present (should start with RIFF)
      const hasWavHeader = audioData.slice(0, 4).toString() === "RIFF";

      if (!hasWavHeader) {
        // Add WAV header if missing
        const wavHeader = Buffer.alloc(44); // Standard WAV header size

        // RIFF header
        wavHeader.write("RIFF", 0);
        wavHeader.writeUInt32LE(audioData.length + 36, 4); // File size - 8
        wavHeader.write("WAVE", 8);

        // fmt chunk
        wavHeader.write("fmt ", 12);
        wavHeader.writeUInt32LE(16, 16); // fmt chunk size
        wavHeader.writeUInt16LE(1, 20); // Audio format (1 = PCM)
        wavHeader.writeUInt16LE(1, 22); // Number of channels
        wavHeader.writeUInt32LE(44100, 24); // Sample rate
        wavHeader.writeUInt32LE(44100 * 2, 28); // Byte rate
        wavHeader.writeUInt16LE(2, 32); // Block align
        wavHeader.writeUInt16LE(16, 34); // Bits per sample

        // data chunk
        wavHeader.write("data", 36);
        wavHeader.writeUInt32LE(audioData.length, 40);

        // Combine header and audio data
        const completeAudioData = Buffer.concat([wavHeader, audioData]);

        return new Response(completeAudioData, {
          headers: {
            "Content-Type": "audio/wav",
            "Content-Length": completeAudioData.length.toString(),
          },
        });
      }
    }

    // If not WAV or header already present, return as is
    return new Response(audioData, {
      headers: {
        "Content-Type": outputFormat === "wav" ? "audio/wav" : "audio/mp3",
        "Content-Length": audioData.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error generating speech:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate speech" },
      { status: 500 }
    );
  }
}
