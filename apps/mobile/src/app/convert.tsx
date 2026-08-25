import { Ionicons } from "@expo/vector-icons";
import type { Quote } from "@efex/contracts";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/app-shell";
import { Button, Card, Field, Pill } from "../components/ui";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { colors, fonts } from "../lib/theme";

export default function ConvertScreen() {
  const [amount, setAmount] = useState("25000"); const [quote, setQuote] = useState<Quote>(); const [loading, setLoading] = useState(false); const [error, setError] = useState<string>();
  async function calculate() { setLoading(true); setError(undefined); try { setQuote(await api.quote(Number(amount))); } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible cotizar"); } finally { setLoading(false); } }
  return <AppShell title="Convertir divisas" subtitle="Consulta una conversión indicativa usando la cotización demo.">
    <Card style={styles.panel}>
      <View style={styles.currencyHeader}><Pill tone="yellow">USD A MXN</Pill><Text style={styles.available}>Disponible: {money(875000, "USD")}</Text></View>
      <Field keyboardType="decimal-pad" label="Monto a convertir" onChangeText={(value) => { setAmount(value); setQuote(undefined); }} value={amount} />
      <View style={styles.swap}><Ionicons color={colors.ink} name="swap-vertical" size={20} /></View>
      <View style={styles.destination}><Text style={styles.destinationLabel}>Recibirás</Text><Text style={styles.destinationValue}>{quote ? money(quote.destinationAmount, "MXN") : "Cotiza para ver el monto"}</Text></View>
      {quote ? <View style={styles.details}><Text style={styles.detail}>Tipo de cambio: 1 USD = {quote.rate.toFixed(2)} MXN</Text><Text style={styles.detail}>Comisión: {money(quote.fee, "USD")}</Text></View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!quote ? <Button disabled={Number(amount) <= 0} label="Obtener cotización" loading={loading} onPress={() => void calculate()} /> : <><Button label="Usar en un pago" onPress={() => router.push({ pathname: "/payments/new", params: { amount: String(quote.sourceAmount) } })} /><Button label="Nueva cotización" onPress={() => setQuote(undefined)} variant="secondary" /></>}
    </Card>
  </AppShell>;
}

const styles = StyleSheet.create({
  panel: { alignSelf: "center", gap: 18, maxWidth: 620, padding: 24, width: "100%" }, currencyHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, available: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 }, swap: { alignItems: "center", alignSelf: "center", backgroundColor: colors.yellow, borderRadius: 20, height: 40, justifyContent: "center", width: 40 }, destination: { backgroundColor: colors.canvas, borderRadius: 10, gap: 7, padding: 18 }, destinationLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 }, destinationValue: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 26 }, details: { borderTopColor: colors.line, borderTopWidth: 1, gap: 8, paddingTop: 14 }, detail: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 }, error: { color: colors.red, fontFamily: fonts.body, fontSize: 12 },
});
