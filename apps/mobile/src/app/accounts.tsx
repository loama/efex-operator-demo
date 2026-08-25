import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/app-shell";
import { Button, Card, EmptyState, ErrorState, LoadingState, Pill, SectionTitle } from "../components/ui";
import { useApiResource } from "../hooks/use-api-resource";
import { useHydratedWindowWidth } from "../hooks/use-hydrated-window-width";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { colors, fonts } from "../lib/theme";

export default function AccountsScreen() {
  const loader = useCallback(() => api.dashboard(), []);
  const resource = useApiResource(loader);
  const desktop = useHydratedWindowWidth() >= 900;
  return (
    <AppShell title="Cuentas" subtitle="Controla saldos globales desde un solo lugar." action={<Button label="Convertir divisas" onPress={() => router.push("/convert")} />}>
      {resource.loading ? <LoadingState /> : null}
      {resource.error ? <ErrorState message={resource.error} onRetry={() => void resource.reload()} /> : null}
      {resource.data && !resource.data.accounts.length ? <EmptyState title="No hay cuentas disponibles" message="Las cuentas de la empresa aparecerán aquí cuando estén habilitadas." action={<Button label="Volver al inicio" onPress={() => router.push("/")} />} /> : null}
      {resource.data?.accounts.length ? <>
        <View style={[styles.grid, !desktop && styles.gridMobile]}>
          {resource.data.accounts.map((account) => <Card key={account.id} style={styles.accountCard}>
            <View style={styles.accountTop}><View style={styles.currency}><Text style={styles.currencyText}>{account.currency}</Text></View><Pill tone="success">Activa</Pill></View>
            <Text style={styles.accountName}>{account.name}</Text><Text style={styles.accountNumber}>{account.accountNumber}</Text>
            <Text style={styles.balance}>{money(account.balance, account.currency)}</Text>
            <View style={styles.availableRow}><Text style={styles.availableLabel}>Disponible</Text><Text style={styles.availableValue}>{money(account.available, account.currency)}</Text></View>
          </Card>)}
        </View>
        <View style={styles.statements}><SectionTitle title="Documentos" /><Card style={styles.documentCard}>
          <View style={styles.documentIcon}><Ionicons color={colors.ink} name="document-text-outline" size={22} /></View>
          <View style={styles.documentCopy}><Text style={styles.documentTitle}>Estados de cuenta</Text><Text style={styles.documentMeta}>Consulta y descarga documentos mensuales de la cuenta demo.</Text></View>
          <Button label="Ver estados" onPress={() => router.push("/statements")} variant="secondary" />
        </Card></View>
      </> : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: 18 }, gridMobile: { flexDirection: "column" }, accountCard: { flex: 1, gap: 7, minWidth: 0, padding: 22 }, accountTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }, currency: { alignItems: "center", backgroundColor: colors.yellow, borderRadius: 20, height: 40, justifyContent: "center", width: 54 }, currencyText: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 12 }, accountName: { color: colors.ink, fontFamily: fonts.heading, fontSize: 17 }, accountNumber: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 }, balance: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 29, letterSpacing: -0.6, marginTop: 22 }, availableRow: { borderTopColor: colors.line, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 13, paddingTop: 13 }, availableLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 }, availableValue: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 11 }, statements: { gap: 12 }, documentCard: { alignItems: "center", flexDirection: "row", gap: 14 }, documentIcon: { alignItems: "center", backgroundColor: colors.canvas, borderRadius: 20, height: 40, justifyContent: "center", width: 40 }, documentCopy: { flex: 1, gap: 4 }, documentTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 }, documentMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
});
