import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { AssistantResponse } from "@efex/contracts";
import { AppShell } from "../components/app-shell";
import { Button, Card, Pill } from "../components/ui";
import { API_ORIGIN, api } from "../lib/api";
import { colors, fonts } from "../lib/theme";

type Message = { id: string; role: "user" | "assistant"; text: string; response?: AssistantResponse };
const prompts = ["¿Cuál es mi saldo?", "¿Cómo va mi último pago?", "Necesito mi estado de cuenta"];

export default function AssistantScreen() {
  const [input, setInput] = useState(""); const [messages, setMessages] = useState<Message[]>([{ id: "hello", role: "assistant", text: "Hola, Santiago. Puedo ayudarte a consultar saldos, pagos, beneficiarios y estados de cuenta usando los datos sintéticos de esta demo." }]); const [loading, setLoading] = useState(false); const [error, setError] = useState<string>();
  async function send(value = input) {
    const text = value.trim(); if (!text || loading) return;
    setInput(""); setError(undefined); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text }]); setLoading(true);
    try { const response = await api.assistant(text); setMessages((current) => [...current, { id: response.id, role: "assistant", text: response.text, response }]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible responder"); }
    finally { setLoading(false); }
  }
  return <AppShell title="Asistente EFEX" subtitle="Las mismas operaciones pueden exponerse en WhatsApp, Slack, Teams o SMS.">
    <View style={styles.layout}>
      <View style={styles.chatColumn}>
        <View style={styles.channelHeader}><View style={styles.channelIcon}><Ionicons color={colors.ink} name="chatbubble-ellipses" size={20} /></View><View style={styles.flex}><Text style={styles.channelTitle}>EFEX por WhatsApp</Text><Text style={styles.channelMeta}>La demo responde a mensajes entrantes. Las acciones se envían como texto, botones y archivos compatibles.</Text></View><Pill tone="success">En línea</Pill></View>
        <Card style={styles.chat}>
          <View style={styles.messages}>{messages.map((message) => <View key={message.id} style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.assistantBubble]}>
            <Text style={[styles.bubbleText, message.role === "user" && styles.userText]}>{message.text}</Text>
            {message.response?.action ? <Pressable accessibilityLabel={message.response.action.label} accessibilityRole="button" onPress={() => router.push(message.response!.action!.route as Href)} style={styles.actionCard}><Text style={styles.actionLabel}>{message.response.action.label}</Text><Ionicons color={colors.ink} name="arrow-forward" size={17} /></Pressable> : null}
            {message.response?.attachment ? <Pressable accessibilityLabel={`Descargar ${message.response.attachment.label}`} accessibilityRole="button" onPress={() => void Linking.openURL(`${API_ORIGIN}${message.response!.attachment!.url}`)} style={styles.actionCard}><Ionicons color={colors.ink} name="document-text-outline" size={18} /><Text style={styles.actionLabel}>{message.response.attachment.label}</Text><Ionicons color={colors.ink} name="download-outline" size={17} /></Pressable> : null}
          </View>)}{loading ? <View style={[styles.bubble, styles.assistantBubble, styles.typing]}><ActivityIndicator color={colors.ink} size="small" /><Text style={styles.typingText}>Consultando la cuenta demo</Text></View> : null}</View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.composer}><TextInput accessibilityLabel="Mensaje al asistente" multiline onChangeText={setInput} onSubmitEditing={() => void send()} placeholder="Pregunta sobre tu operación" placeholderTextColor={colors.muted} style={styles.input} value={input} /><Pressable accessibilityLabel="Enviar mensaje" accessibilityRole="button" disabled={!input.trim() || loading} onPress={() => void send()} style={[styles.send, (!input.trim() || loading) && styles.sendDisabled]}><Ionicons color={colors.ink} name="arrow-up" size={20} /></Pressable></View>
        </Card>
      </View>
      <View style={styles.sideColumn}>
        <Text style={styles.quickTitle}>Preguntas rápidas</Text>{prompts.map((prompt) => <Button key={prompt} label={prompt} onPress={() => void send(prompt)} variant="secondary" />)}
        <Card style={styles.note}><Pill tone="yellow">CANAL DEMO</Pill><Text style={styles.noteTitle}>Sin imágenes generadas</Text><Text style={styles.noteText}>Saldos y estados de pago se responden con texto y botones nativos. Los estados de cuenta se adjuntan como documentos. Así se mantiene la experiencia clara y compatible con WhatsApp.</Text></Card>
      </View>
    </View>
  </AppShell>;
}

const styles = StyleSheet.create({
  layout: { flexDirection: "row", flexWrap: "wrap", gap: 20 }, chatColumn: { flex: 2, gap: 12, minWidth: 320 }, sideColumn: { flex: 1, gap: 10, minWidth: 240 }, channelHeader: { alignItems: "center", backgroundColor: colors.ink, borderRadius: 12, flexDirection: "row", gap: 12, padding: 16 }, channelIcon: { alignItems: "center", backgroundColor: colors.yellow, borderRadius: 20, height: 40, justifyContent: "center", width: 40 }, flex: { flex: 1 }, channelTitle: { color: colors.paper, fontFamily: fonts.bodySemiBold, fontSize: 14 }, channelMeta: { color: "#A5A5A5", fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginTop: 3 }, chat: { gap: 14, minHeight: 470, padding: 16 }, messages: { flex: 1, gap: 10, justifyContent: "flex-end" }, bubble: { borderRadius: 12, maxWidth: "84%", padding: 12 }, userBubble: { alignSelf: "flex-end", backgroundColor: colors.ink }, assistantBubble: { alignSelf: "flex-start", backgroundColor: colors.canvas }, bubbleText: { color: colors.ink, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 }, userText: { color: colors.paper }, actionCard: { alignItems: "center", backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 9, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 10, minHeight: 42, paddingHorizontal: 12 }, actionLabel: { color: colors.ink, flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 11 }, typing: { alignItems: "center", flexDirection: "row", gap: 8 }, typingText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 }, composer: { alignItems: "flex-end", backgroundColor: colors.canvas, borderRadius: 12, flexDirection: "row", gap: 8, padding: 8 }, input: { color: colors.ink, flex: 1, fontFamily: fonts.body, fontSize: 14, maxHeight: 100, minHeight: 40, paddingHorizontal: 8, paddingVertical: 10 }, send: { alignItems: "center", backgroundColor: colors.yellow, borderRadius: 20, height: 40, justifyContent: "center", width: 40 }, sendDisabled: { opacity: 0.4 }, error: { color: colors.red, fontFamily: fonts.body, fontSize: 11 }, quickTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 16, marginBottom: 3 }, note: { gap: 9, marginTop: 10 }, noteTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 15 }, noteText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 18 },
});
