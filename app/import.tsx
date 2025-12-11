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
  Modal,
  Text,
  TextInput,
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

  // NEW: Fields user must enter before importing
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [setName, setSetName] = useState("");
  const [showModal, setShowModal] = useState(false);

  if (!db) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Initializing database...</Text>
      </View>
    );
  }

  // Convert ArrayBuffer -> Base64
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

  // -----------------------------------------------------------
  // SHOW INPUT POPUP BEFORE IMPORTING
  // -----------------------------------------------------------
  const startImport = () => {
    setSubject("");
    setTopic("");
    setSetName("");
    setShowModal(true);
  };

  const validateAndImport = () => {
    if (!subject.trim() || !topic.trim() || !setName.trim()) {
      Alert.alert("Missing fields", "Please enter all values.");
      return;
    }
    setShowModal(false);
    handleImport();
  };

  // -----------------------------------------------------------
  // MAIN IMPORT LOGIC
  // -----------------------------------------------------------
  const handleImport = async () => {
    setLoading(true);

    try {
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
      let text = "";
      const mime = asset.mimeType;

      // -------- TEXT FILES --------
      if (mime === "text/plain") {
        text = file.textSync();
      }

      // -------- PDF --------
      else if (mime === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);

        const genAI = new GoogleGenAI({ apiKey: apiUrls.geminiKey });
        const prompt = `Extract readable text from this PDF (base64). Return only the text:\n${base64}`;

        const output = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ parts: [{ text: prompt }] }],
        });

        text = output?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      }

      // -------- IMAGES → OCR --------
      else if (mime.startsWith("image/")) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);

        const genAI = new GoogleGenAI({ apiKey: apiUrls.geminiKey });
        const prompt = "Extract ALL readable text from this image.";

        const output = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { data: base64, mimeType: mime } }
              ]
            }
          ],
        });

        text = output?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      }

      // -------- AUDIO / VIDEO → TRANSCRIPTION --------
      else if (mime.startsWith("audio/") || mime.startsWith("video/")) {
        const API_KEY = apiUrls.assemblyAIKey;
        const uploadUrl = "https://api.assemblyai.com/v2/upload";

        const fileData = await fetch(asset.uri);
        const blob = await fileData.blob();

        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: { authorization: API_KEY, "Content-Type": mime },
          body: blob,
        });

        const uploadJson = await uploadResponse.json();
        const audioUrl = uploadJson.upload_url;

        const transRes = await fetch("https://api.assemblyai.com/v2/transcript", {
          method: "POST",
          headers: { authorization: API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ audio_url: audioUrl })
        });

        const transJson = await transRes.json();
        let status = transJson.status;
        let finalText = "";

        while (status !== "completed" && status !== "error") {
          await new Promise(r => setTimeout(r, 3000));
          const pollRes = await fetch(
            `https://api.assemblyai.com/v2/transcript/${transJson.id}`,
            { headers: { authorization: API_KEY } }
          );
          const pollJson = await pollRes.json();
          status = pollJson.status;

          if (status === "completed") finalText = pollJson.text;
        }

        text = finalText;
      }

      // -------- GENERATE Q&A --------
      const genAI = new GoogleGenAI({ apiKey: apiUrls.geminiKey });
      const qaPrompt = `From this content, generate 5 Q&A pairs. Return only JSON array of:
[
  { "question": "...", "answer": "..." }
]
Content:
${text}`;

      const qaRes = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: qaPrompt }] }],
      });

      const rawJson = qaRes?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      let qaPairs = [];

      try {
        qaPairs = JSON.parse(rawJson);
      } catch {
        qaPairs = [{ question: "Parse error", answer: "Check JSON" }];
      }

      // -----------------------------------------------------------
      // SAVE INTO DATABASE USING USER PROVIDED SUBJECT / TOPIC / SET
      // -----------------------------------------------------------
      await db.withTransactionAsync(async () => {
        const createdAt = new Date().toISOString();

        // Insert subject
        await db.runAsync(`INSERT OR IGNORE INTO subjects (name) VALUES (?)`, subject);
        const [subjRow] = await db.getAllAsync(
          `SELECT id FROM subjects WHERE name = ? LIMIT 1`,
          [subject]
        );
        const subjectId = subjRow.id;

        // Insert topic
        await db.runAsync(
          `INSERT OR IGNORE INTO topics (name, subject_id) VALUES (?, ?)`,
          topic,
          subjectId
        );
        const [topicRow] = await db.getAllAsync(
          `SELECT id FROM topics WHERE name = ? AND subject_id = ? LIMIT 1`,
          topic,
          subjectId
        );
        const topicId = topicRow.id;

        // Insert flashcard set
        await db.runAsync(
          `INSERT INTO flashcard_set (title, topic_id, created_at) VALUES (?, ?, ?)`,
          setName,
          topicId,
          createdAt
        );
        const [setRow] = await db.getAllAsync(
          `SELECT id FROM flashcard_set WHERE title = ? ORDER BY id DESC LIMIT 1`,
          setName
        );
        const flashcardSetId = setRow.id;

        // Insert data entry
        const dataRes = await db.runAsync(
          `INSERT INTO data (name, size, body, topic_id, created_at) VALUES (?, ?, ?, ?, ?)`,
          asset.name,
          text.length,
          text,
          topicId,
          createdAt
        );
        const dataId = dataRes.lastInsertRowId;

        // Insert questions + link to flashcards
        for (const qa of qaPairs) {
          const qRes = await db.runAsync(
            `INSERT INTO questions (data_id, question, answer) VALUES (?, ?, ?)`,
            dataId,
            qa.question,
            qa.answer
          );

          const qId = qRes.lastInsertRowId;

          await db.runAsync(
            `INSERT INTO flashcard_set_questions (flashcard_set_id, question_id) VALUES (?, ?)`,
            flashcardSetId,
            qId
          );
        }
      });

      Alert.alert("Success", "Import completed!");
    }

    catch (err) {
      console.error(err);
      Alert.alert("Import error", String(err));
    }

    finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // UI
  // -----------------------------------------------------------
  return (
    <View style={{ flex: 1, padding: Spacing.lg, backgroundColor: theme.background }}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: theme.text, marginBottom: Spacing.md }}>
        Import
      </Text>
      <Text style={{ color: theme.text, opacity: 0.9, marginBottom: Spacing.lg }}>
        Upload your study materials here.
      </Text>

      {/* BUTTON THAT OPENS SUBJECT/TOPIC/SET FORM */}
      <TouchableOpacity
        onPress={startImport}
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

      {/* INPUT MODAL */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: "#0009",
          justifyContent: "center",
          alignItems: "center",
          padding: 20
        }}>
          <View style={{
            width: "100%",
            backgroundColor: theme.card,
            padding: 20,
            borderRadius: 12
          }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: theme.text, marginBottom: 12 }}>
              Import Settings
            </Text>

            <TextInput
              placeholder="Subject"
              value={subject}
              onChangeText={setSubject}
              style={{
                backgroundColor: theme.input,
                padding: 12,
                marginBottom: 12,
                borderRadius: 8,
                color: theme.text
              }}
            />

            <TextInput
              placeholder="Topic"
              value={topic}
              onChangeText={setTopic}
              style={{
                backgroundColor: theme.input,
                padding: 12,
                marginBottom: 12,
                borderRadius: 8,
                color: theme.text
              }}
            />

            <TextInput
              placeholder="Flashcard Set Name"
              value={setName}
              onChangeText={setSetName}
              style={{
                backgroundColor: theme.input,
                padding: 12,
                marginBottom: 20,
                borderRadius: 8,
                color: theme.text
              }}
            />

            <TouchableOpacity
              onPress={validateAndImport}
              style={{
                backgroundColor: theme.teal,
                padding: 12,
                borderRadius: 8,
                alignItems: "center"
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={{ marginTop: 10, alignItems: "center" }}
            >
              <Text style={{ color: theme.text }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
