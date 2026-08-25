import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppShell } from "../components/app-shell";
import { Button, Card, ErrorState, LoadingState, Pill, SectionTitle } from "../components/ui";
import { useApiResource } from "../hooks/use-api-resource";
import { api } from "../lib/api";
import { compactMoney, money } from "../lib/format";
import { colors, fonts } from "../lib/theme";

export default function DashboardScreen() {
  const loader = useCallback(() => api.dashboard(), []);
  const { data, error, loading, reload } = useApiResource(loader);
  const desktop = useWindowDimensions().width >= 900;
  return (
    <AppShell title="Buenos días, Santiago" subtitle="Todo lo que necesitas para operar tu tesorería global." action={<Button icon="arrow-up" label="Enviar dinero" onPress={() => router.push("/payments/new")} />}>
      {loading ? <LoadingState label="Consultando tus cuentas" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
      {data ? (
        <>
          <View style={[styles.metrics, !desktop && styles.metricsMobile]}>
            <Card style={[styles.balanceCard, !desktop ? styles.balanceCardMobile : undefined]}>
              <View style={styles.balanceTop}><Text style={styles.metricLabel}>Saldo consolidado</Text><Pill tone="yellow">USD</Pill></View>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.balance}>{money(data.totalUsd, "USD")}</Text>
              <Text style={styles.balanceMeta}>Disponible en todas tus cuentas demo</Text>
            </Card>
            <Card style={styles.metricCard}>
              <View style={styles.metricIcon}><Ionicons color={colors.green} name="arrow-down" size={18} /></View>
              <Text style={styles.metricLabel}>Recibido este mes</Text><Text style={styles.metricValue}>{compactMoney(data.receivedThisMonth, "USD")}</Text>
            </Card>
            <Card style={styles.metricCard}>
              <View style={styles.metricIconDark}><Ionicons color={colors.paper} name="arrow-up" size={18} /></View>
              <Text style={styles.metricLabel}>Enviado este mes</Text><Text style={styles.metricValue}>{compactMoney(data.sentThisMonth, "USD")}</Text>
            </Card>
          </View>
          <View style={[styles.mainGrid, !desktop && styles.mainGridMobile]}>
            <View style={styles.gridColumn}>
              <SectionTitle title="Tus cuentas" action={<Pressable onPress={() => router.push("/accounts")}><Text style={styles.link}>Ver todas</Text></Pressable>} />
              <Card style={styles.flushCard}>
                {data.accounts.map((account, index) => (
                  <Pressable key={account.id} onPress={() => router.push("/accounts")} style={[styles.accountRow, index > 0 && styles.rowBorder]}>
                    <View style={styles.currencyMark}><Text style={styles.currencyMarkText}>{account.currency[0]}</Text></View>
                    <View style={styles.rowCopy}><Text style={styles.rowTitle}>{account.name}</Text><Text style={styles.rowMeta}>{account.accountNumber}</Text></View>
                    <View style={styles.rowAmount}><Text style={styles.rowValue}>{money(account.balance, account.currency)}</Text><Text style={styles.rowMeta}>Disponible {money(account.available, account.currency)}</Text></View>
                    <Ionicons color={colors.muted} name="chevron-forward" size={17} />
                  </Pressable>
                ))}
              </Card>
            </View>
            <View style={styles.gridColumn}>
              <SectionTitle title="Actividad reciente" action={<Pressable onPress={() => router.push("/activity")}><Text style={styles.link}>Ver todo</Text></Pressable>} />
              <Card style={styles.flushCard}>
                {data.activity.slice(0, 4).map((item, index) => (
                  <View key={item.id} style={[styles.activityRow, index > 0 && styles.rowBorder]}>
                    <View style={item.direction === "in" ? styles.activityIn : styles.activityOut}><Ionicons color={item.direction === "in" ? colors.green : colors.ink} name={item.direction === "in" ? "arrow-down" : "arrow-up"} size={16} /></View>
                    <View style={styles.rowCopy}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowMeta}>{item.subtitle}</Text></View>
                    <View style={styles.rowAmount}><Text style={[styles.rowValue, item.direction === "in" && styles.positive]}>{item.direction === "in" ? "+" : ""}{money(item.amount, item.currency)}</Text><Text style={styles.rowMeta}>{item.status === "approved" ? "Aprobado" : "En proceso"}</Text></View>
                  </View>
                ))}
              </Card>
            </View>
          </View>
          <Card style={styles.assistantBanner}>
            <View style={styles.spark}><Ionicons color={colors.ink} name="sparkles" size={22} /></View>
            <View style={styles.assistantCopy}><Text style={styles.assistantTitle}>Pregunta a EFEX</Text><Text style={styles.assistantText}>Consulta saldos, pagos y estados de cuenta usando lenguaje natural.</Text></View>
            <Button label="Abrir asistente" onPress={() => router.push("/assistant")} variant="secondary" />
          </Card>
        </>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", gap: 16 }, metricsMobile: { flexWrap: "wrap" },
  balanceCard: { backgroundColor: colors.ink, flex: 1.5, minWidth: 330, padding: 24 }, balanceCardMobile: { flexBasis: "100%", minWidth: 0 },
  balanceTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, balance: { color: colors.paper, fontFamily: fonts.headingBold, fontSize: 31, letterSpacing: -1, marginTop: 22 }, balanceMeta: { color: "#9A9A9A", fontFamily: fonts.body, fontSize: 12, marginTop: 7 },
  metricCard: { flex: 1, gap: 10, justifyContent: "center", minWidth: 180, padding: 22 }, metricIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 17, height: 34, justifyContent: "center", width: 34 }, metricIconDark: { alignItems: "center", backgroundColor: colors.ink, borderRadius: 17, height: 34, justifyContent: "center", width: 34 }, metricLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 12 }, metricValue: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 24, letterSpacing: -0.5 },
  mainGrid: { flexDirection: "row", gap: 20 }, mainGridMobile: { flexDirection: "column" }, gridColumn: { flex: 1, gap: 12, minWidth: 0 }, link: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12, textDecorationLine: "underline" }, flushCard: { padding: 0 },
  accountRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 76, paddingHorizontal: 16 }, activityRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 16 }, rowBorder: { borderTopColor: colors.line, borderTopWidth: 1 }, currencyMark: { alignItems: "center", backgroundColor: colors.yellow, borderRadius: 18, height: 36, justifyContent: "center", width: 36 }, currencyMarkText: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 14 }, rowCopy: { flex: 1, gap: 4, minWidth: 0 }, rowTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 }, rowMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 }, rowAmount: { alignItems: "flex-end", gap: 4 }, rowValue: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12 }, positive: { color: colors.green }, activityIn: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 18, height: 36, justifyContent: "center", width: 36 }, activityOut: { alignItems: "center", backgroundColor: colors.canvas, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  assistantBanner: { alignItems: "center", backgroundColor: colors.yellow, borderColor: colors.yellow, flexDirection: "row", gap: 15, padding: 18 }, spark: { alignItems: "center", backgroundColor: colors.paper, borderRadius: 22, height: 44, justifyContent: "center", width: 44 }, assistantCopy: { flex: 1, gap: 4 }, assistantTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 16 }, assistantText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
});
