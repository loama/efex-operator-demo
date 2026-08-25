import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/app-shell";
import { Button, Card, EmptyState, ErrorState, LoadingState, Pill } from "../components/ui";
import { useApiResource } from "../hooks/use-api-resource";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { colors, fonts } from "../lib/theme";

export default function ActivityScreen() {
  const loader = useCallback(() => api.dashboard(), []); const resource = useApiResource(loader);
  return <AppShell title="Actividad" subtitle="Movimientos recientes de la empresa demo.">
    {resource.loading ? <LoadingState /> : null}{resource.error ? <ErrorState message={resource.error} onRetry={() => void resource.reload()} /> : null}
    {resource.data && !resource.data.activity.length ? <EmptyState title="Todavía no hay actividad" message="Los pagos simulados y las entradas de la cuenta aparecerán aquí." action={<Button label="Crear pago" onPress={() => router.push("/payments/new")} />} /> : null}
    {resource.data?.activity.length ? <Card style={styles.list}>{resource.data.activity.map((item, index) => <View key={item.id} style={[styles.row, index > 0 && styles.border]}>
      <View style={item.direction === "in" ? styles.iconIn : styles.iconOut}><Ionicons color={item.direction === "in" ? colors.green : colors.ink} name={item.direction === "in" ? "arrow-down" : "arrow-up"} size={18} /></View>
      <View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.meta}>{item.subtitle} · {new Date(item.createdAt).toLocaleString("es-MX")}</Text></View>
      <View style={styles.amount}><Text style={[styles.value, item.direction === "in" && styles.positive]}>{item.direction === "in" ? "+" : ""}{money(item.amount, item.currency)}</Text><Pill tone={item.status === "approved" ? "success" : "warning"}>{item.status === "approved" ? "Aprobado" : "En proceso"}</Pill></View>
    </View>)}</Card> : null}
  </AppShell>;
}

const styles = StyleSheet.create({ list: { padding: 0 }, row: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 78, paddingHorizontal: 16 }, border: { borderTopColor: colors.line, borderTopWidth: 1 }, iconIn: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 19, height: 38, justifyContent: "center", width: 38 }, iconOut: { alignItems: "center", backgroundColor: colors.yellow, borderRadius: 19, height: 38, justifyContent: "center", width: 38 }, copy: { flex: 1, gap: 4 }, title: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 }, meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 }, amount: { alignItems: "flex-end", gap: 5 }, value: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12 }, positive: { color: colors.green } });
