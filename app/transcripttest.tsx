import { useState } from "react";

export default function Transcripttest() {
  const [status, setStatus] = useState("idle");
  const [text, setText] = useState("");

  const runTranscription = async () => {
    setStatus("starting");

    const apiKey = "9d5f8494428f49b6aabedf950ad49d21"; // testing only

    try {
      // 1. Create the transcription request
      const createRes = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "POST",
        headers: {
          authorization: apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          audio_url: "https://assembly.ai/wildfires.mp3",
          speech_model: "universal",
        }),
      });

      const createData = await createRes.json();
      const transcriptId = createData.id;

      setStatus("processing");

      // 2. Poll until the transcription is ready
      while (true) {
        const pollRes = await fetch(
          `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
          {
            headers: { authorization: apiKey },
          }
        );

        const pollData = await pollRes.json();

        if (pollData.status === "completed") {
          setText(pollData.text);
          setStatus("done");
          break;
        } else if (pollData.status === "error") {
          setStatus("error");
          break;
        }

        // wait 3 seconds
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>AssemblyAI Test (Direct API Call)</h1>

      <button onClick={runTranscription}>Run Test Transcription</button>

      <p>Status: {status}</p>

      {text && (
        <div>
          <h3>Transcript:</h3>
          <p>{text}</p>
        </div>
      )}
    </div>
  );
}