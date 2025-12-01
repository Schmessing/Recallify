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
      // IMAGES → OCR
      // ========================================
      else if (mime.startsWith("image/")) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);

        const resp = await fetch(apiUrls.ocrUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiUrls.ocrKey}`
          },
          body: JSON.stringify({
            prompt: `Extract readable text from this image (base64). Return only text:\n${base64}`
          })
        });

        const data = await resp.json();
        text = data?.text ?? "";
      }

      // ========================================
      // AUDIO/VIDEO → SPEECH TO TEXT
      // ========================================
      else if (mime.startsWith("audio/") || mime.startsWith("video/")) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);

        const resp = await fetch(apiUrls.googletranscriptUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiUrls.googletranscriptKey}`
          },
          body: JSON.stringify({
            prompt: `Transcribe this ${mime} file (base64).`
          })
        });

        const data = await resp.json();
        text = data?.text ?? "";
      }

      else {
        Alert.alert("Unsupported file type");
        return;
      }

      // ========================================
      // GENERATE QUESTION & ANSWER
      // ========================================
      try {
        console.log("Sending content to Gemini API for Q&A generation...");
        const genAI = new GoogleGenAI({ apiKey: apiUrls.geminiKey });

        const output = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ parts: [{ text: `Generate one question and its answer for this content:\n${text}` }] }],
        });

        const generated = output?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        console.log("Received generated Q&A:", generated);

        const [q, a] = generated.split("\n");

        // ========================================
        // SAVE TO DB
        // ========================================
        const createdAt = new Date().toISOString();
        const topicId = 1;

        const stmt = await db.prepareAsync(
          `INSERT INTO data (name, size, body, topic_id, created_at) 
          VALUES ($name, $size, $body, $topicId, $createdAt)`
        );

        const res = await stmt.executeAsync({
          $name: asset.name,
          $size: text.length,
          $body: text,
          $topicId: topicId,
          $createdAt: createdAt
        });

        await stmt.finalizeAsync();

        const dataId = res.lastInsertRowId;

        await db.runAsync(
          `INSERT INTO questions (data_id, question, answer) VALUES (?, ?, ?)`,
          dataId,
          q || "Generated question",
          a || "Generated answer"
        );

        console.log("Q&A saved to database successfully!");
      } 
      catch (err) {
        console.error("Gemini Q&A API call failed:", err);
        Alert.alert("Error generating question & answer", String(err));
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
