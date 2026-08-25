import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/app-shell";
import { Button, Card, ErrorState, LoadingState, Pill } from "../components/ui";
import { useApiResource } from "../hooks/use-api-resource";
import { API_ORIGIN, api } from "../lib/api";
import { colors, fonts } from "../lib/theme";

export default function StatementsScreen() {
  const loader = useCallback(() => api.statements(), []); const resource = useApiResource(loader);
  return <AppShell title="Estados de cuenta" subtitle="Documentos sintéticos disponibles para la cuenta USD.">
    {resource.loading ? <LoadingState label="Consultando documentos" /> : null}
    {resource.error ? <ErrorState message={resource.error} onRetry={() => void resource.reload()} /> : null}
    {resource.data ? <Card style={styles.list}>{resource.data.map((statement, index) => <View key={statement.id} style={[styles.row, index > 0 && styles.border]}>
      <View style={styles.icon}><Ionicons color={colors.ink} name="document-text-outline" size={21} /></View>
      <View style={styles.copy}><Text style={styles.title}>{statement.month} {statement.year}</Text><Text style={styles.meta}>Cuenta global USD</Text></View>
      <Pill tone="success">Disponible</Pill><Button icon="download-outline" label="Descargar" onPress={() => void Linking.openURL(`${API_ORIGIN}${statement.downloadUrl}`)} variant="secondary" />
    </View>)}</Card> : null}
  </AppShell>;
}

const styles = StyleSheet.create({ list: { padding: 0 }, row: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 78, paddingHorizontal: 16 }, border: { borderTopColor: colors.line, borderTopWidth: 1 }, icon: { alignItems: "center", backgroundColor: colors.canvas, borderRadius: 19, height: 38, justifyContent: "center", width: 38 }, copy: { flex: 1, gap: 4 }, title: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 }, meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 } });
