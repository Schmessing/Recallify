import { useState } from "react";

export default function OCRAPITesting() {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const runOCR = async () => {
    setError("");
    setResult("");

    try {
      const formData = new FormData();
      formData.append("apikey", "K85413674888957");
      formData.append("url", "http://dl.a9t9.com/ocrbenchmark/eng.png");
      formData.append("language", "eng");

      const res = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.ParsedResults) {
        setError("OCR failed: " + JSON.stringify(data));
        return;
      }

      const text = data.ParsedResults[0].ParsedText;
      setResult(text);
    } catch (e) {
      console.error("OCR error:", e);
      setError("OCR error: " + e.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>OCR Space Test</h1>

      <button onClick={runOCR}>Run OCR</button>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <h3>Result:</h3>
      <pre>{result}</pre>
    </div>
  );
}