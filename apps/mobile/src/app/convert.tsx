import { Ionicons } from "@expo/vector-icons";
import { supportedCurrencies, type Currency, type Quote } from "@efex/contracts";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/app-shell";
import { Button, Card, CurrencyField, ErrorState, LoadingState, Pill } from "../components/ui";
import { useApiResource } from "../hooks/use-api-resource";
import { api } from "../lib/api";
import { money, normalizeCurrencyInput, parseCurrencyInput } from "../lib/format";
import { colors, fonts } from "../lib/theme";

const currencyNames: Record<Currency, string> = {
  USD: "Dólar estadounidense",
  MXN: "Peso mexicano",
  EUR: "Euro",
  COP: "Peso colombiano",
  UYU: "Peso uruguayo",
  ARS: "Peso argentino",
};

function CurrencySelector({ label, selected, onSelect }: { label: string; selected: Currency; onSelect: (currency: Currency) => void }) {
  return (
    <View style={styles.selectorGroup}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <ScrollView contentContainerStyle={styles.currencyOptions} horizontal showsHorizontalScrollIndicator={false}>
        {supportedCurrencies.map((currency) => {
          const active = currency === selected;
          return (
            <Pressable
              accessibilityLabel={`${label}: ${currencyNames[currency]}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={currency}
              onPress={() => onSelect(currency)}
              style={({ pressed }) => [styles.currencyOption, active && styles.currencyOptionActive, pressed && styles.currencyOptionPressed]}
            >
              <Text style={[styles.currencyOptionCode, active && styles.currencyOptionCodeActive]}>{currency}</Text>
              <Text numberOfLines={1} style={[styles.currencyOptionName, active && styles.currencyOptionNameActive]}>{currencyNames[currency]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function ConvertScreen() {
  const [amount, setAmount] = useState(() => normalizeCurrencyInput("25000"));
  const [sourceCurrency, setSourceCurrency] = useState<Currency>("USD");
  const [destinationCurrency, setDestinationCurrency] = useState<Currency>("MXN");
  const [quote, setQuote] = useState<Quote>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const dashboardLoader = useCallback(() => api.dashboard(), []);
  const dashboard = useApiResource(dashboardLoader);
  const sourceAccount = dashboard.data?.accounts.find((account) => account.currency === sourceCurrency);

  function clearQuote() {
    setQuote(undefined);
    setError(undefined);
  }

  function selectSource(currency: Currency) {
    if (currency === destinationCurrency) setDestinationCurrency(sourceCurrency);
    setSourceCurrency(currency);
    clearQuote();
  }

  function selectDestination(currency: Currency) {
    if (currency === sourceCurrency) setSourceCurrency(destinationCurrency);
    setDestinationCurrency(currency);
    clearQuote();
  }

  function swapCurrencies() {
    setSourceCurrency(destinationCurrency);
    setDestinationCurrency(sourceCurrency);
    clearQuote();
  }

  async function calculate() {
    setLoading(true);
    setError(undefined);
    try {
      setQuote(await api.quote(parseCurrencyInput(amount), sourceCurrency, destinationCurrency));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible cotizar");
    } finally {
      setLoading(false);
    }
  }

  const canUseInPayment = sourceCurrency === "USD" && destinationCurrency === "MXN";

  return (
    <AppShell title="Convertir divisas" subtitle="Consulta una conversión indicativa usando la cotización demo.">
      {dashboard.loading ? <LoadingState label="Consultando saldo disponible" /> : null}
      {dashboard.error ? <ErrorState message={dashboard.error} onRetry={() => void dashboard.reload()} /> : null}
      {dashboard.data ? (
        <Card style={styles.panel}>
          <View style={styles.currencyHeader}>
            <Pill tone="yellow">COTIZACIÓN DEMO</Pill>
            <Text style={styles.available}>{sourceAccount ? `Disponible: ${money(sourceAccount.available, sourceCurrency)}` : "Sin cuenta operativa asociada"}</Text>
          </View>

          <CurrencySelector label="Moneda de origen" onSelect={selectSource} selected={sourceCurrency} />
          <CurrencyField
            currency={sourceCurrency}
            label="Monto a convertir"
            onValueChange={(value) => {
              setAmount(value);
              clearQuote();
            }}
            value={amount}
          />

          <Pressable accessibilityLabel="Intercambiar monedas" accessibilityRole="button" onPress={swapCurrencies} style={({ pressed }) => [styles.swap, pressed && styles.swapPressed]}>
            <Ionicons color={colors.ink} name="swap-vertical" size={20} />
          </Pressable>

          <CurrencySelector label="Moneda destino" onSelect={selectDestination} selected={destinationCurrency} />
          <View style={styles.destination}>
            <Text style={styles.destinationLabel}>Recibirás</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.destinationValue}>{quote ? money(quote.destinationAmount, destinationCurrency) : "Cotiza para ver el monto"}</Text>
          </View>

          {quote ? (
            <View style={styles.details}>
              <Text style={styles.detail}>Tipo de cambio: 1 {sourceCurrency} = {quote.rate.toLocaleString("en-US", { maximumFractionDigits: 6 })} {destinationCurrency}</Text>
              <Text style={styles.detail}>Comisión: {money(quote.fee, sourceCurrency)}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!quote ? (
            <Button disabled={!(parseCurrencyInput(amount) > 0)} label="Obtener cotización" loading={loading} onPress={() => void calculate()} />
          ) : (
            <>
              {canUseInPayment ? <Button label="Usar en un pago" onPress={() => router.push({ pathname: "/payments/new", params: { amount: String(quote.sourceAmount) } })} /> : null}
              <Button label="Nueva cotización" onPress={clearQuote} variant={canUseInPayment ? "secondary" : "primary"} />
            </>
          )}
        </Card>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  panel: { alignSelf: "center", gap: 18, maxWidth: 680, padding: 24, width: "100%" },
  currencyHeader: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  available: { color: colors.muted, flexShrink: 1, fontFamily: fonts.body, fontSize: 11, textAlign: "right" },
  selectorGroup: { gap: 8 },
  selectorLabel: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13 },
  currencyOptions: { gap: 8, paddingRight: 2 },
  currencyOption: { backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 10, borderWidth: 2, gap: 2, minWidth: 98, paddingHorizontal: 12, paddingVertical: 10 },
  currencyOptionActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  currencyOptionPressed: { opacity: 0.78 },
  currencyOptionCode: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  currencyOptionCodeActive: { color: colors.yellow },
  currencyOptionName: { color: colors.muted, fontFamily: fonts.body, fontSize: 9 },
  currencyOptionNameActive: { color: colors.paper },
  swap: { alignItems: "center", alignSelf: "center", backgroundColor: colors.yellow, borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  swapPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  destination: { backgroundColor: colors.canvas, borderRadius: 10, gap: 7, padding: 18 },
  destinationLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  destinationValue: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 26 },
  details: { borderTopColor: colors.line, borderTopWidth: 1, gap: 8, paddingTop: 14 },
  detail: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  error: { color: colors.red, fontFamily: fonts.body, fontSize: 12 },
});
