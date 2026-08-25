import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/app-shell";
import { Avatar, Button, Card, EmptyState, ErrorState, Field, LoadingState, Pill } from "../components/ui";
import { api } from "../lib/api";
import { initials } from "../lib/format";
import { colors, fonts } from "../lib/theme";
import type { Beneficiary } from "@efex/contracts";

export default function BeneficiariesScreen() {
  const [items, setItems] = useState<Beneficiary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [focusedId, setFocusedId] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try { setItems(await api.beneficiaries()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Error desconocido"); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const normalizedQuery = query.toLocaleLowerCase("es");
  const filtered = items.filter((item) => `${item.name} ${item.bank}`.toLocaleLowerCase("es").includes(normalizedQuery));

  return (
    <AppShell title="Beneficiarios" subtitle="Administra los destinos autorizados para tus pagos." action={<Button icon="person-add-outline" label="Añadir beneficiario" onPress={() => router.push("/beneficiaries/new")} />}>
      <View style={styles.search}><Ionicons color={colors.muted} name="search" size={18} /><Field accessibilityLabel="Buscar beneficiarios" label="Buscar" onChangeText={setQuery} placeholder="Nombre o banco" value={query} /></View>
      {loading ? <LoadingState label="Cargando beneficiarios" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && !filtered.length ? <EmptyState title="Sin resultados" message="No encontramos beneficiarios con ese nombre. Puedes cambiar la búsqueda o añadir uno nuevo." action={<Button label="Añadir beneficiario" onPress={() => router.push("/beneficiaries/new")} />} /> : null}
      {filtered.length ? <Card style={styles.list}>{filtered.map((item, index) => (
        <Pressable accessibilityLabel={`Enviar dinero a ${item.name}`} accessibilityRole="button" key={item.id} onBlur={() => setFocusedId(undefined)} onFocus={() => setFocusedId(item.id)} onPress={() => router.push({ pathname: "/payments/new", params: { beneficiaryId: item.id } })} style={[styles.row, index > 0 && styles.rowBorder, focusedId === item.id && styles.rowFocused]}>
          <Avatar label={initials(item.name)} />
          <View style={styles.copy}><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{item.country} · {item.bank} · {item.accountNumber}</Text></View>
          <Pill tone={item.status === "active" ? "success" : "warning"}>{item.status === "active" ? "Activo" : "Pendiente"}</Pill>
          <Ionicons color={colors.muted} name="chevron-forward" size={17} />
        </Pressable>
      ))}</Card> : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  search: { alignItems: "flex-end", flexDirection: "row", gap: 10, maxWidth: 520 }, list: { padding: 0 }, row: { alignItems: "center", borderColor: "transparent", borderWidth: 2, flexDirection: "row", gap: 13, minHeight: 78, paddingHorizontal: 15 }, rowBorder: { borderTopColor: colors.line }, rowFocused: { borderColor: colors.ink }, copy: { flex: 1, gap: 5 }, name: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 }, meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
});
