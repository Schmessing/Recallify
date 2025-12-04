// app/import.tsx
import { GoogleGenAI } from '@google/genai';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { useSettings } from '../constants/settingsProvider';
import { Colors, Spacing } from '../constants/theme';

export default function ImportScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { apiUrls, darkMode } = useSettings();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(false);

  if (!db) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Initializing database...</Text>
      </View>
    );
  }

  // CONVERT ARRAY BUFFER → BASE64 (RN SAFE)
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return global.btoa(binary);
  };

  const handleImport = async () => {
    setLoading(true);

    try {
      console.log("Selecting document...");
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) {
        Alert.alert("No file selected");
        return;
      }

      const file = new File(asset.uri);
      console.log("Using new File API:", file);

      let text = "";
      const mime = asset.mimeType;

      // ========================================
      // TEXT FILES
      // ========================================
      if (mime === "text/plain") {
        text = file.textSync();
      }

      // ========================================
      // PDF
      // ========================================
      else if (mime === "application/pdf") {
        try {
          console.log("Reading PDF as ArrayBuffer...");
          const arrayBuffer = await file.arrayBuffer();
          console.log("PDF ArrayBuffer length:", arrayBuffer.byteLength);

          const base64 = arrayBufferToBase64(arrayBuffer);
          console.log("PDF Base64 length:", base64.length);

          const prompt = `Extract readable text from this PDF (base64-encoded). Return only the text:\n${base64}`;
          console.log("Sending to Gemini API...");

          const genAI = new GoogleGenAI({ apiKey: apiUrls.geminiKey });
          const output = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
          });

          text = output?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
          console.log("Received text:", text.slice(0, 100));
        } catch (e) {
          console.error("PDF processing failed:", e);
          throw e;
        }
      }

      // ========================================
      // OFFICE DOCUMENTS
      // ========================================
      else if (
        mime === "application/msword" ||
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mime === "application/vnd.ms-excel" ||
        mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mime === "application/vnd.ms-powerpoint" ||
        mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);

        const prompt = `Extract readable text from this document (base64-encoded). Return only the text:\n${base64}`;

        const genAI = new GoogleGenAI({ apiKey: apiUrls.geminiKey });
        const output = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ parts: [{ text: prompt }] }],
        });

        text = output?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      }

            // ========================================
      // IMAGES → OCR using GEMINI
      // ========================================
      else if (mime.startsWith("image/")) {
        console.log("Processing image with Gemini Vision API...");
        const arrayBuffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        
        // Define the parts for the Gemini API call: a prompt and the image data
        const promptText = "Extract all readable text from this image. Return only the text extracted, with minimal formatting.";

        const imagePart = {
            inlineData: {
                data: base64,
                mimeType: mime, // Use the detected mime type (e.g., image/jpeg, image/png)
            },
        };

        // Ensure you have initialized GoogleGenAI correctly at the start of handleImport or globally
        // const genAI = new GoogleGenAI({ apiKey: apiUrls.geminiKey }); 
        const genAI = new GoogleGenAI({ apiKey: apiUrls.geminiKey });

        // Use a vision-capable model like gemini-2.5-flash which supports images
        const output = await genAI.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: [
                { parts: [{ text: promptText }, imagePart] }
            ],
            // Optional: You can add configuration options here if needed, 
            // but the default should work for simple text extraction.
        });

        text = output?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        console.log("Text extracted by Gemini Vision (Length:", text.length, "):", text.slice(0, 100));
      }


      // ========================================
      // AUDIO/VIDEO → SPEECH TO TEXT (using AssemblyAI)
      // ========================================
      else if (mime.startsWith("audio/") || mime.startsWith("video/")) {
        console.log("Uploading audio/video file to AssemblyAI...");
        const API_KEY = apiUrls.assemblyAIKey; // Make sure you have this key in your settings
        const uploadUrl = "https://api.assemblyai.com/v2/upload";

        // 1. Convert file URI to a Blob for reliable upload via fetch in React Native
        const fileUri = asset.uri;
        const fileData = await fetch(fileUri);
        const blob = await fileData.blob();
        
        // 2. Upload the file binary data directly to AssemblyAI's upload endpoint
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'authorization': API_KEY, // Auth header is standard for all AA calls
                'Content-Type': mime, // Use the detected mime type
            },
            body: blob,
        });

        if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.text();
            console.error("AssemblyAI Upload failed:", errorBody);
            Alert.alert("Upload Error", `Upload failed. Details: ${errorBody}`);
            setLoading(false);
            return;
        }

        const uploadData = await uploadResponse.json();
        const audioUrl = uploadData.upload_url;
        console.log("File uploaded successfully. Audio URL:", audioUrl);

        // 3. Submit the uploaded URL for transcription
        const transcriptUrl = "https://api.assemblyai.com/v2/transcript";
        const transcriptResponse = await fetch(transcriptUrl, {
            method: 'POST',
            headers: {
                'authorization': API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                audio_url: audioUrl, // Use the URL returned from the upload step
                // Optional config parameters can be added here, e.g.,
                // speaker_labels: true,
                // language_detection: true,
            }),
        });

        if (!transcriptResponse.ok) {
            const errorBody = await transcriptResponse.text();
            console.error("AssemblyAI Transcription submission failed:", errorBody);
            Alert.alert("Transcription Error", `Submission failed. Details: ${errorBody}`);
            setLoading(false);
            return;
        }

        const transcriptData = await transcriptResponse.json();
        const transcriptId = transcriptData.id;
        console.log("Transcription job submitted with ID:", transcriptId);

        // 4. Poll for the transcription result (AssemblyAI handles this asynchronously)
        let status = transcriptData.status;
        while (status !== 'completed' && status !== 'error') {
            console.log(`Polling transcript status: ${status}...`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
            
            const pollingUrl = `${transcriptUrl}/${transcriptId}`;
            const pollingResponse = await fetch(pollingUrl, {
                method: 'GET',
                headers: {
                    'authorization': API_KEY,
                },
            });

            const pollingData = await pollingResponse.json();
            status = pollingData.status;

            if (status === 'completed') {
                text = pollingData.text ?? "";
                console.log("Transcription complete.");
            } else if (status === 'error') {
                console.error("Transcription failed:", pollingData.error);
                Alert.alert("Transcription Failed", `Error: ${pollingData.error}`);
                setLoading(false);
                return;
            }
        }
      }            


      // ========================================
      // GENERATE QUESTION & ANSWER (MULTIPLE)
      // ========================================
      try {
        console.log("Sending content to Gemini API for Q&A generation...");
        const genAI = new GoogleGenAI({ apiKey: apiUrls.geminiKey });

        // Request multiple Q/A pairs in JSON format for easier parsing and iteration.
        const prompt = `From the following content, generate exactly five questions and their corresponding answers. Return the result as a JSON array of objects, where each object has 'question' and 'answer' keys.
        
        CRITICAL RULE: The questions and answers MUST be based solely on the factual information present in the CONTENT section below. DO NOT ask about the file format, the extraction process, or the base64 encoding. If the content is empty, return an empty JSON array [].

        Do not include any text before or after the JSON array.

Example format:
[
  {"question": "Q1", "answer": "A1"},
  {"question": "Q2", "answer": "A2"}
]

Content:
${text}`;

        const output = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ parts: [{ text: prompt }] }],
        });
// ... (rest of the file is the same)


        const generatedText = output?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        console.log("Received generated JSON:", generatedText);

        let qaPairs = [];
        try {
          // Parse the generated JSON string into an array of objects
          qaPairs = JSON.parse(generatedText);
          if (!Array.isArray(qaPairs) || qaPairs.length === 0) {
            throw new Error("Parsed JSON is not a valid, non-empty array.");
          }
        } catch (error) {
          console.error("Failed to parse generated Q&A JSON:", error);
          Alert.alert("Error", "Failed to parse AI response. Using a default single entry.");
          // Fallback if parsing fails, use a default single pair
          qaPairs = [{ question: "Generation failed to parse", answer: "Check console logs" }];
        }

        // Use a transaction for atomic DB operations
        await db.withTransactionAsync(async () => {
          const createdAt = new Date().toISOString();
          const topicId = 1; // Assuming a default topic exists

          // 1. Insert the main 'data' record once
          const dataInsertStmt = await db.prepareAsync(
            `INSERT INTO data (name, size, body, topic_id, created_at) 
             VALUES ($name, $size, $body, $topicId, $createdAt)`
          );

          const dataRes = await dataInsertStmt.executeAsync({
            $name: asset.name,
            $size: text.length,
            $body: text,
            $topicId: topicId,
            $createdAt: createdAt
          });
          await dataInsertStmt.finalizeAsync();

          const dataId = dataRes.lastInsertRowId;
          console.log(`Data saved (ID: ${dataId})`);


          // 2. Create the Flashcard Set and Quiz set once
          const flashcardSetTitle = `Flashcards from ${asset.name}`;
          const flashcardInsertRes = await db.runAsync(
            `INSERT INTO flashcard_set (title, created_at) VALUES (?, ?)`,
            flashcardSetTitle,
            createdAt
          );
          const flashcardSetId = flashcardInsertRes.lastInsertRowId;
          console.log(`Flashcard Set saved (ID: ${flashcardSetId})`);


          const quizTitle = `Quiz from ${asset.name}`;
          const quizInsertRes = await db.runAsync(
            `INSERT INTO quizzes (title, created_at) VALUES (?, ?)`,
            quizTitle,
            createdAt
          );
          const quizId = quizInsertRes.lastInsertRowId;
          console.log(`Quiz saved (ID: ${quizId})`);


          // 3. Iterate over the Q/A pairs to insert into 'questions' and link them
          for (const pair of qaPairs) {
            // Insert question into 'questions' table
            const questionInsertRes = await db.runAsync(
              `INSERT INTO questions (data_id, question, answer) 
               VALUES (?, ?, ?)`,
              dataId,
              pair.question || "Generated question",
              pair.answer || "Generated answer"
            );

            const questionId = questionInsertRes.lastInsertRowId;
            
            // Link question to flashcard set
            await db.runAsync(
              `INSERT INTO flashcard_set_questions (question_id, flashcard_set_id) VALUES (?, ?)`,
              questionId,
              flashcardSetId
            );

            // Link question to quiz
            await db.runAsync(
              `INSERT INTO quiz_questions (questions_id, quiz_id) VALUES (?, ?)`,
              questionId,
              quizId
            );
            // console.log(`Question ID ${questionId} linked to set ${flashcardSetId} and quiz ${quizId}`);
          }
          
          console.log(`${qaPairs.length} Q&A pairs, Flashcard set, and Quiz saved to database successfully!`);
        }); // End of transaction
      } 
      catch (err) {
        console.error("Gemini Q&A/DB save failed:", err);
        Alert.alert("Error generating or saving content", String(err));
      }
    } 
    catch (err) {
      console.error("Import failed:", err);
      Alert.alert("Error", String(err));
    }

    finally {
      setLoading(false);
    }
  }; // <-- closes handleImport

  // ... (rest of the component remains the same)
  return (
    <View style={{ flex: 1, padding: Spacing.lg, backgroundColor: theme.background }}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: theme.text, marginBottom: Spacing.md }}>
        Import
      </Text>
      <Text style={{ color: theme.text, opacity: 0.9, marginBottom: Spacing.lg }}>
        Upload your study materials here.
      </Text>

      <TouchableOpacity
        onPress={handleImport}
        style={{
          backgroundColor: theme.teal,
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Import File</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/home")}
        style={{
          marginTop: Spacing.md,
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
          borderWidth: 2,
          borderColor: theme.teal,
        }}
      >
        <Text style={{ color: theme.teal, fontWeight: "700" }}>Back to Home</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" style={{ marginTop: Spacing.lg }} />}
    </View>
  );
}