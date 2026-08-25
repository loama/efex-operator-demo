import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback } from "react";
import { Linking, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppShell } from "../components/app-shell";
import { Button, Card, EmptyState, ErrorState, LoadingState, Pill } from "../components/ui";
import { useApiResource } from "../hooks/use-api-resource";
import { API_ORIGIN, api } from "../lib/api";
import { money } from "../lib/format";
import { colors, fonts } from "../lib/theme";

export default function StatementsScreen() {
  const loader = useCallback(() => api.statements(), []); const resource = useApiResource(loader);
  const narrow = useWindowDimensions().width < 520;
  return <AppShell title="Estados de cuenta" subtitle="Documentos sintéticos disponibles para la cuenta USD.">
    {resource.loading ? <LoadingState label="Consultando documentos" /> : null}
    {resource.error ? <ErrorState message={resource.error} onRetry={() => void resource.reload()} /> : null}
    {resource.data && !resource.data.length ? <EmptyState title="No hay estados disponibles" message="Los documentos mensuales aparecerán aquí cuando estén disponibles." action={<Button label="Volver a cuentas" onPress={() => router.push("/accounts")} />} /> : null}
    {resource.data?.length ? <Card style={styles.list}>{resource.data.map((statement, index) => <View key={statement.id} style={[styles.row, narrow && styles.rowNarrow, index > 0 && styles.border]}>
      <View style={styles.documentMain}>
        <View style={styles.icon}><Ionicons color={colors.ink} name="document-text-outline" size={21} /></View>
        <View style={styles.copy}><Text style={styles.title}>{statement.month} {statement.year}</Text><Text style={styles.meta}>Saldo final {money(statement.closingBalance, "USD")}</Text></View>
        <Pill tone="success">Disponible</Pill>
      </View>
      <View style={narrow ? styles.actionNarrow : undefined}><Button icon="download-outline" label="Descargar" onPress={() => void Linking.openURL(`${API_ORIGIN}${statement.downloadUrl}`)} variant="secondary" /></View>
    </View>)}</Card> : null}
  </AppShell>;
}

const styles = StyleSheet.create({ list: { padding: 0 }, row: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 78, padding: 16 }, rowNarrow: { alignItems: "stretch", flexDirection: "column" }, documentMain: { alignItems: "center", flex: 1, flexDirection: "row", gap: 12, minWidth: 0 }, actionNarrow: { alignSelf: "stretch" }, border: { borderTopColor: colors.line, borderTopWidth: 1 }, icon: { alignItems: "center", backgroundColor: colors.canvas, borderRadius: 19, height: 38, justifyContent: "center", width: 38 }, copy: { flex: 1, gap: 4, minWidth: 0 }, title: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 }, meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 } });
