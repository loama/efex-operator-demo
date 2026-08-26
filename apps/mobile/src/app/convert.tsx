import { Ionicons } from "@expo/vector-icons";
import type { Quote } from "@efex/contracts";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/app-shell";
import { Button, Card, CurrencyField, ErrorState, LoadingState, Pill } from "../components/ui";
import { useApiResource } from "../hooks/use-api-resource";
import { api } from "../lib/api";
import { money, normalizeCurrencyInput, parseCurrencyInput } from "../lib/format";
import { colors, fonts } from "../lib/theme";

export default function ConvertScreen() {
  const [amount, setAmount] = useState(() => normalizeCurrencyInput("25000")); const [quote, setQuote] = useState<Quote>(); const [loading, setLoading] = useState(false); const [error, setError] = useState<string>();
  const dashboardLoader = useCallback(() => api.dashboard(), []);
  const dashboard = useApiResource(dashboardLoader);
  const usdAccount = dashboard.data?.accounts.find((account) => account.currency === "USD");
  async function calculate() { setLoading(true); setError(undefined); try { setQuote(await api.quote(parseCurrencyInput(amount))); } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible cotizar"); } finally { setLoading(false); } }
  return <AppShell title="Convertir divisas" subtitle="Consulta una conversión indicativa usando la cotización demo.">
    {dashboard.loading ? <LoadingState label="Consultando saldo disponible" /> : null}
    {dashboard.error ? <ErrorState message={dashboard.error} onRetry={() => void dashboard.reload()} /> : null}
    {dashboard.data && !usdAccount ? <ErrorState message="La cuenta USD no está disponible en esta demo." onRetry={() => void dashboard.reload()} /> : null}
    {usdAccount ? <Card style={styles.panel}>
      <View style={styles.currencyHeader}><Pill tone="yellow">USD A MXN</Pill><Text style={styles.available}>Disponible: {money(usdAccount.available, "USD")}</Text></View>
      <CurrencyField currency="USD" label="Monto a convertir" onValueChange={(value) => { setAmount(value); setQuote(undefined); }} value={amount} />
      <View style={styles.swap}><Ionicons color={colors.ink} name="swap-vertical" size={20} /></View>
      <View style={styles.destination}><Text style={styles.destinationLabel}>Recibirás</Text><Text style={styles.destinationValue}>{quote ? money(quote.destinationAmount, "MXN") : "Cotiza para ver el monto"}</Text></View>
      {quote ? <View style={styles.details}><Text style={styles.detail}>Tipo de cambio: 1 USD = {quote.rate.toFixed(2)} MXN</Text><Text style={styles.detail}>Comisión: {money(quote.fee, "USD")}</Text></View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!quote ? <Button disabled={!(parseCurrencyInput(amount) > 0)} label="Obtener cotización" loading={loading} onPress={() => void calculate()} /> : <><Button label="Usar en un pago" onPress={() => router.push({ pathname: "/payments/new", params: { amount: String(quote.sourceAmount) } })} /><Button label="Nueva cotización" onPress={() => setQuote(undefined)} variant="secondary" /></>}
    </Card> : null}
  </AppShell>;
}

const styles = StyleSheet.create({
  panel: { alignSelf: "center", gap: 18, maxWidth: 620, padding: 24, width: "100%" }, currencyHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, available: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 }, swap: { alignItems: "center", alignSelf: "center", backgroundColor: colors.yellow, borderRadius: 20, height: 40, justifyContent: "center", width: 40 }, destination: { backgroundColor: colors.canvas, borderRadius: 10, gap: 7, padding: 18 }, destinationLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 }, destinationValue: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 26 }, details: { borderTopColor: colors.line, borderTopWidth: 1, gap: 8, paddingTop: 14 }, detail: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 }, error: { color: colors.red, fontFamily: fonts.body, fontSize: 12 },
});
