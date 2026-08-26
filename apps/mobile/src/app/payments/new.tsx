import { Ionicons } from "@expo/vector-icons";
import type { Beneficiary, Payment, Quote } from "@efex/contracts";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppShell } from "../../components/app-shell";
import { Avatar, Button, Card, CurrencyField, EmptyState, ErrorState, Field, LoadingState, Pill } from "../../components/ui";
import { useHydratedWindowWidth } from "../../hooks/use-hydrated-window-width";
import { api } from "../../lib/api";
import { initials, money, normalizeCurrencyInput, parseCurrencyInput } from "../../lib/format";
import { colors, fonts } from "../../lib/theme";

type Step = "beneficiary" | "amount" | "review" | "done";

export default function NewPaymentScreen() {
  const params = useLocalSearchParams<{ beneficiaryId?: string; amount?: string }>();
  const [step, setStep] = useState<Step>("beneficiary"); const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]); const [selected, setSelected] = useState<Beneficiary>();
  const [amount, setAmount] = useState(() => normalizeCurrencyInput(params.amount ?? "25000")); const [reference, setReference] = useState("Invoice 1088"); const [quote, setQuote] = useState<Quote>(); const [payment, setPayment] = useState<Payment>();
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string>(); const [successProgress] = useState(() => new Animated.Value(0));
  const narrow = useHydratedWindowWidth() < 480;

  useEffect(() => { void api.beneficiaries().then((items) => { setBeneficiaries(items); const match = items.find((item) => item.id === params.beneficiaryId); if (match) { setSelected(match); setStep("amount"); } }).catch((reason) => setError(reason instanceof Error ? reason.message : "Error desconocido")).finally(() => setLoading(false)); }, [params.beneficiaryId]);
  useEffect(() => {
    if (step !== "done") return;
    successProgress.setValue(0);
    Animated.timing(successProgress, { duration: 240, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: Platform.OS !== "web" }).start();
  }, [step, successProgress]);

  async function retryBeneficiaries() {
    setLoading(true); setError(undefined);
    try { setBeneficiaries(await api.beneficiaries()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Error desconocido"); } finally { setLoading(false); }
  }

  async function getQuote() {
    const value = parseCurrencyInput(amount);
    if (!Number.isFinite(value) || value <= 0) return setError("Ingresa un monto válido");
    setLoading(true); setError(undefined);
    try { setQuote(await api.quote(value, "USD", selected?.currency ?? "MXN")); setStep("review"); } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible cotizar"); } finally { setLoading(false); }
  }
  async function send() {
    if (!selected || !quote) return;
    setLoading(true); setError(undefined);
    try {
      const draft = await api.createPayment({ beneficiaryId: selected.id, sourceCurrency: "USD", destinationCurrency: selected.currency, sourceAmount: quote.sourceAmount, reference });
      const submitted = await api.submitPayment(draft.id); setPayment(submitted); setStep("done");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible crear el pago"); } finally { setLoading(false); }
  }

  const title = step === "done" ? "Pago creado" : "Enviar dinero";
  return <AppShell title={title} subtitle="La transferencia se procesa únicamente dentro del entorno demo.">
    {step !== "done" ? <View style={styles.steps}>{["Beneficiario", "Monto", "Revisión"].map((label, index) => { const current = step === "beneficiary" ? 0 : step === "amount" ? 1 : 2; return <View key={label} style={styles.step}><View style={[styles.stepDot, index <= current && styles.stepDotActive]}><Text style={[styles.stepNumber, index <= current && styles.stepNumberActive]}>{index + 1}</Text></View><Text style={[styles.stepLabel, index === current && styles.stepLabelActive]}>{label}</Text></View>; })}</View> : null}
    {loading && step === "beneficiary" ? <LoadingState label="Cargando beneficiarios" /> : null}
    {step === "beneficiary" && !loading && error ? <ErrorState message={error} onRetry={() => void retryBeneficiaries()} /> : null}
    {step === "beneficiary" && !loading && !error && !beneficiaries.length ? <EmptyState title="No hay beneficiarios" message="Añade un beneficiario antes de crear un pago simulado." action={<Button label="Añadir beneficiario" onPress={() => router.push("/beneficiaries/new")} />} /> : null}
    {step === "beneficiary" && !loading && !error && beneficiaries.length ? <Card style={styles.panel}><Text style={styles.panelTitle}>Elige un beneficiario</Text>{beneficiaries.map((item) => <Pressable accessibilityLabel={`Enviar a ${item.name}`} accessibilityRole="button" key={item.id} onPress={() => { setSelected(item); setStep("amount"); }} style={styles.beneficiary}><Avatar label={initials(item.name)} /><View style={styles.flex}><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{item.bank} · {item.accountNumber}</Text></View><Ionicons color={colors.muted} name="chevron-forward" size={18} /></Pressable>)}</Card> : null}
    {step === "amount" && selected ? <Card style={styles.panel}>
      <View style={styles.selected}><Avatar label={initials(selected.name)} /><View style={styles.flex}><Text style={styles.name}>Para {selected.name}</Text><Text style={styles.meta}>{selected.bank} · {selected.currency}</Text></View><Button label="Cambiar" onPress={() => setStep("beneficiary")} variant="quiet" /></View>
      <CurrencyField currency="USD" label="Monto a enviar" onValueChange={setAmount} value={amount} />
      <Field label="Concepto" onChangeText={setReference} placeholder="Invoice 1088" value={reference} />
      {error ? <Text style={styles.error}>{error}</Text> : null}<Button disabled={!reference.trim() || !(parseCurrencyInput(amount) > 0)} label="Revisar pago" loading={loading} onPress={() => void getQuote()} />
    </Card> : null}
    {step === "review" && selected && quote ? <Card style={styles.panel}>
      <View style={styles.reviewTop}><View style={styles.reviewSide}><Text style={styles.reviewLabel}>Envías</Text><Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={styles.reviewAmount}>{money(quote.sourceAmount, "USD")}</Text></View><Ionicons color={colors.ink} name="arrow-forward" size={24} /><View style={[styles.reviewSide, styles.reviewRight]}><Text style={styles.reviewLabel}>Recibe</Text><Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={styles.reviewAmount}>{money(quote.destinationAmount, selected.currency)}</Text></View></View>
      <View style={styles.summary}><Summary label="Beneficiario" value={selected.name} /><Summary label="Tipo de cambio" value={`1 USD = ${quote.rate.toFixed(2)} ${selected.currency}`} /><Summary label="Comisión" value={money(quote.fee, "USD")} /><Summary label="Concepto" value={reference} /></View>
      <View style={styles.warning}><Pill tone="yellow">SIMULACIÓN</Pill><Text style={styles.warningText}>Confirmar no moverá fondos reales.</Text></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}<View style={[styles.actions, narrow && styles.actionsNarrow]}><Button label="Atrás" onPress={() => setStep("amount")} variant="secondary" /><Button label="Confirmar pago demo" loading={loading} onPress={() => void send()} /></View>
    </Card> : null}
    {step === "done" && payment ? <Animated.View style={{ opacity: successProgress, transform: [{ translateY: successProgress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}><Card style={styles.success}>
      <View style={styles.successIcon}><Ionicons color={colors.ink} name="checkmark" size={30} /></View><Pill tone="warning">En proceso</Pill>
      <Text style={styles.successTitle}>Pago simulado enviado</Text><Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={styles.successAmount}>{money(payment.sourceAmount, payment.sourceCurrency)}</Text><Text style={styles.successText}>El pago a {payment.beneficiaryName} quedó registrado con el identificador {payment.id.slice(0, 18)}.</Text>
      <Button label="Ver pagos" onPress={() => router.replace("/payments")} /><Button label="Volver al inicio" onPress={() => router.replace("/")} variant="secondary" />
    </Card></Animated.View> : null}
  </AppShell>;
}

function Summary({ label, value }: { label: string; value: string }) { return <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  steps: { alignSelf: "center", flexDirection: "row", justifyContent: "center", maxWidth: 560, width: "100%" }, step: { alignItems: "center", flex: 1, gap: 6 }, stepDot: { alignItems: "center", backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 17, borderWidth: 1, height: 34, justifyContent: "center", width: 34 }, stepDotActive: { backgroundColor: colors.yellow, borderColor: colors.yellow }, stepNumber: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 12 }, stepNumberActive: { color: colors.ink }, stepLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 }, stepLabelActive: { color: colors.ink, fontFamily: fonts.bodySemiBold }, panel: { alignSelf: "center", gap: 18, maxWidth: 650, padding: 24, width: "100%" }, panelTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 18 }, beneficiary: { alignItems: "center", borderColor: colors.line, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 68, padding: 12 }, selected: { alignItems: "center", backgroundColor: colors.canvas, borderRadius: 10, flexDirection: "row", gap: 12, padding: 12 }, flex: { flex: 1, gap: 4 }, name: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 }, meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 }, error: { color: colors.red, fontFamily: fonts.body, fontSize: 12 }, reviewTop: { alignItems: "center", backgroundColor: colors.canvas, borderRadius: 10, flexDirection: "row", gap: 12, justifyContent: "space-between", padding: 18 }, reviewSide: { flex: 1, minWidth: 0 }, reviewRight: { alignItems: "flex-end" }, reviewLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 }, reviewAmount: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 23, marginTop: 4, maxWidth: "100%" }, summary: { borderBottomColor: colors.line, borderBottomWidth: 1, borderTopColor: colors.line, borderTopWidth: 1, paddingVertical: 8 }, summaryRow: { flexDirection: "row", gap: 12, justifyContent: "space-between", paddingVertical: 9 }, summaryLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 }, summaryValue: { color: colors.ink, flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: "right" }, warning: { alignItems: "center", flexDirection: "row", gap: 10 }, warningText: { color: colors.muted, flex: 1, fontFamily: fonts.body, fontSize: 11 }, actions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" }, actionsNarrow: { flexDirection: "column" }, success: { alignItems: "center", alignSelf: "center", gap: 12, maxWidth: 540, padding: 32, width: "100%" }, successIcon: { alignItems: "center", backgroundColor: colors.yellow, borderRadius: 30, height: 60, justifyContent: "center", width: 60 }, successTitle: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 25, marginTop: 4 }, successAmount: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 31, maxWidth: "100%" }, successText: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 19, marginBottom: 8, maxWidth: 420, textAlign: "center" },
});
