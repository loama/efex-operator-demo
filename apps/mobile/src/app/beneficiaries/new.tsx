import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Currency } from "@efex/contracts";
import { AppShell } from "../../components/app-shell";
import { Button, Card, Field, Pill } from "../../components/ui";
import { api } from "../../lib/api";
import { colors, fonts } from "../../lib/theme";

export default function NewBeneficiaryScreen() {
  const [name, setName] = useState(""); const [bank, setBank] = useState(""); const [accountNumber, setAccountNumber] = useState(""); const [reference, setReference] = useState("");
  const [country, setCountry] = useState("México"); const [currency, setCurrency] = useState<Currency>("MXN"); const [createdId, setCreatedId] = useState<string>();
  const [focusedCurrency, setFocusedCurrency] = useState<Currency>();
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string>(); const [done, setDone] = useState(false);
  const valid = name.trim().length >= 2 && bank.trim().length >= 2 && country.trim().length >= 2 && accountNumber.trim().length >= 4 && reference.trim().length >= 2;

  async function submit() {
    if (!valid) return;
    setLoading(true); setError(undefined);
    try { const created = await api.createBeneficiary({ name, bank, accountNumber, reference, country, currency }); setCreatedId(created.id); setDone(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible guardar el beneficiario"); }
    finally { setLoading(false); }
  }

  return <AppShell title={done ? "Beneficiario añadido" : "Nuevo beneficiario"} subtitle="Los datos se guardan solamente en la base local de esta demo.">
    {done ? <Card style={styles.success}><View style={styles.check}><Text style={styles.checkText}>✓</Text></View><Text style={styles.successTitle}>{name} está listo</Text><Text style={styles.successText}>Ya puedes seleccionarlo al crear un pago simulado.</Text><Button label="Enviar un pago" onPress={() => router.replace({ pathname: "/payments/new", params: { beneficiaryId: createdId } })} /><Button label="Volver a beneficiarios" onPress={() => router.replace("/beneficiaries")} variant="secondary" /></Card> :
      <Card style={styles.form}>
        <View style={styles.demoRow}><Pill tone="yellow">DEMO</Pill><Text style={styles.demoText}>No introduzcas información bancaria real.</Text></View>
        <Field autoCapitalize="words" label="Nombre legal" onChangeText={setName} placeholder="Frutella Company" value={name} />
        <Field autoCapitalize="words" label="Banco" onChangeText={setBank} placeholder="BBVA México" value={bank} />
        <Field autoCapitalize="words" label="País" onChangeText={setCountry} placeholder="México" value={country} />
        <View style={styles.currencyField}><Text style={styles.currencyLabel}>Moneda de recepción</Text><View style={styles.currencyOptions}>{(["MXN", "USD"] as Currency[]).map((item) => <Pressable accessibilityLabel={`Recibir en ${item}`} accessibilityRole="button" accessibilityState={{ selected: currency === item }} key={item} onBlur={() => setFocusedCurrency(undefined)} onFocus={() => setFocusedCurrency(item)} onPress={() => setCurrency(item)} style={[styles.currencyOption, currency === item && styles.currencyOptionActive, focusedCurrency === item && styles.currencyOptionFocused]}><Text style={[styles.currencyOptionText, currency === item && styles.currencyOptionTextActive]}>{item}</Text></Pressable>)}</View></View>
        <Field keyboardType="number-pad" label="Cuenta o CLABE demo" onChangeText={setAccountNumber} placeholder="Ingresa al menos 4 dígitos" value={accountNumber} />
        <Field autoCapitalize="characters" label="Referencia" onChangeText={setReference} placeholder="FRUTELLA 01" value={reference} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}><Button label="Cancelar" onPress={() => router.back()} variant="secondary" /><Button disabled={!valid} label="Guardar beneficiario" loading={loading} onPress={() => void submit()} /></View>
      </Card>}
  </AppShell>;
}

const styles = StyleSheet.create({
  form: { alignSelf: "center", gap: 18, maxWidth: 620, padding: 24, width: "100%" }, demoRow: { alignItems: "center", flexDirection: "row", gap: 10 }, demoText: { color: colors.muted, flex: 1, fontFamily: fonts.body, fontSize: 11 }, currencyField: { gap: 7 }, currencyLabel: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13 }, currencyOptions: { flexDirection: "row", gap: 8 }, currencyOption: { alignItems: "center", backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 999, borderWidth: 2, minWidth: 76, paddingHorizontal: 16, paddingVertical: 10 }, currencyOptionActive: { backgroundColor: colors.yellow, borderColor: colors.yellow }, currencyOptionFocused: { borderColor: colors.ink }, currencyOptionText: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 12 }, currencyOptionTextActive: { color: colors.ink }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 4 }, error: { color: colors.red, fontFamily: fonts.body, fontSize: 12 }, success: { alignItems: "center", alignSelf: "center", gap: 12, maxWidth: 520, padding: 32, width: "100%" }, check: { alignItems: "center", backgroundColor: colors.yellow, borderRadius: 28, height: 56, justifyContent: "center", width: 56 }, checkText: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 24 }, successTitle: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 24 }, successText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginBottom: 8, textAlign: "center" },
});
