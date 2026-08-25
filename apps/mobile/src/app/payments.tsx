import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Payment } from "@efex/contracts";
import { AppShell } from "../components/app-shell";
import { Button, Card, EmptyState, ErrorState, LoadingState, Pill } from "../components/ui";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { colors, fonts } from "../lib/theme";

export default function PaymentsScreen() {
  const [items, setItems] = useState<Payment[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string>();
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setItems(await api.payments()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Error desconocido"); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <AppShell title="Pagos" subtitle="Crea y revisa transferencias simuladas." action={<Button icon="add" label="Nuevo pago" onPress={() => router.push("/payments/new")} />}>
    {loading ? <LoadingState label="Cargando pagos" /> : null}
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    {!loading && !error && !items.length ? <EmptyState title="Todavía no hay pagos" message="Crea tu primer pago simulado para verlo aquí." action={<Button label="Crear pago" onPress={() => router.push("/payments/new")} />} /> : null}
    {items.length ? <Card style={styles.list}>{items.map((payment, index) => <View key={payment.id} style={[styles.row, index > 0 && styles.border]}>
      <View style={styles.icon}><Ionicons color={colors.ink} name="arrow-up" size={17} /></View>
      <View style={styles.copy}><Text style={styles.name}>{payment.beneficiaryName}</Text><Text style={styles.meta}>{payment.reference} · {new Date(payment.createdAt).toLocaleDateString("es-MX")}</Text></View>
      <View style={styles.amount}><Text style={styles.value}>{money(payment.sourceAmount, payment.sourceCurrency)}</Text><Text style={styles.meta}>{money(payment.destinationAmount, payment.destinationCurrency)}</Text></View>
      <Pill tone={payment.status === "approved" ? "success" : payment.status === "processing" ? "warning" : "neutral"}>{payment.status === "approved" ? "Aprobado" : payment.status === "processing" ? "En proceso" : "Borrador"}</Pill>
    </View>)}</Card> : null}
  </AppShell>;
}

const styles = StyleSheet.create({
  list: { padding: 0 }, row: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 78, paddingHorizontal: 16 }, border: { borderTopColor: colors.line, borderTopWidth: 1 }, icon: { alignItems: "center", backgroundColor: colors.yellow, borderRadius: 18, height: 36, justifyContent: "center", width: 36 }, copy: { flex: 1, gap: 4 }, name: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 }, meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 }, amount: { alignItems: "flex-end", gap: 4 }, value: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12 },
});
