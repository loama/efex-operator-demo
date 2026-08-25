import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router, usePathname } from "expo-router";
import type { PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "../lib/theme";
import { Avatar, Pill } from "./ui";

const navigation = [
  { label: "Inicio", icon: "home-outline" as const, route: "/" },
  { label: "Cuentas", icon: "wallet-outline" as const, route: "/accounts" },
  { label: "Pagos", icon: "arrow-up-circle-outline" as const, route: "/payments" },
  { label: "Beneficiarios", icon: "people-outline" as const, route: "/beneficiaries" },
  { label: "Asistente", icon: "chatbubble-ellipses-outline" as const, route: "/assistant" },
];

const future = ["Tarjetas corporativas", "Coberturas", "Crédito"];

export function AppShell({ children, title, subtitle, action }: PropsWithChildren<{ title: string; subtitle?: string; action?: React.ReactNode }>) {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const pathname = usePathname();

  const go = (route: string) => router.push(route as Href);

  if (desktop) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.desktopLayout}>
          <View style={styles.sidebar}>
            <Text style={styles.logo}>EFEX</Text>
            <View style={styles.companyBlock}>
              <Avatar label="AI" size={36} />
              <View style={styles.companyCopy}>
                <Text style={styles.companyName}>Asteria Imports</Text>
                <Text style={styles.companyMeta}>Cuenta demo</Text>
              </View>
            </View>
            <View style={styles.navList}>
              {navigation.map((item) => {
                const active = item.route === "/" ? pathname === "/" : pathname.startsWith(item.route);
                return (
                  <Pressable accessibilityLabel={item.label} accessibilityRole="button" key={item.route} onPress={() => go(item.route)} style={[styles.navItem, active && styles.navItemActive]}>
                    <Ionicons color={active ? colors.ink : "#B9B9B9"} name={item.icon} size={19} />
                    <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.futureBlock}>
              <Text style={styles.futureLabel}>PRÓXIMAMENTE</Text>
              {future.map((item) => <Text key={item} style={styles.futureItem}>{item}</Text>)}
            </View>
            <View style={styles.demoNotice}>
              <Ionicons color={colors.yellow} name="flask-outline" size={18} />
              <Text style={styles.demoNoticeText}>Entorno con datos sintéticos</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.desktopScroll} style={styles.desktopMain}>
            <View style={styles.desktopHeader}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>OPERACIÓN GLOBAL</Text>
                <Text style={styles.desktopTitle}>{title}</Text>
                {subtitle ? <Text style={styles.desktopSubtitle}>{subtitle}</Text> : null}
              </View>
              {action}
            </View>
            <View style={styles.desktopContent}>{children}</View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mobileRoot}>
      <View style={styles.mobileTopbar}>
        <Text style={styles.logo}>EFEX</Text>
        <View style={styles.mobileTopActions}>
          <Pill tone="yellow">DEMO</Pill>
          <Avatar label="SB" size={34} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.mobileScroll} style={styles.mobileMain}>
        <View style={styles.mobileHeader}>
          <Text style={styles.mobileTitle}>{title}</Text>
          {subtitle ? <Text style={styles.mobileSubtitle}>{subtitle}</Text> : null}
          {action ? <View style={styles.mobileAction}>{action}</View> : null}
        </View>
        {children}
      </ScrollView>
      <View style={styles.bottomNav}>
        {navigation.map((item) => {
          const active = item.route === "/" ? pathname === "/" : pathname.startsWith(item.route);
          return (
            <Pressable accessibilityLabel={item.label} accessibilityRole="button" key={item.route} onPress={() => go(item.route)} style={styles.bottomItem}>
              <View style={[styles.bottomIcon, active && styles.bottomIconActive]}><Ionicons color={active ? colors.ink : colors.muted} name={item.icon} size={20} /></View>
              <Text numberOfLines={1} style={[styles.bottomLabel, active && styles.bottomLabelActive]}>{item.label === "Beneficiarios" ? "Benef." : item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.ink, flex: 1 },
  desktopLayout: { flex: 1, flexDirection: "row" },
  sidebar: { backgroundColor: colors.ink, minHeight: "100%", paddingHorizontal: 22, paddingVertical: 26, width: 248 },
  logo: { color: colors.paper, fontFamily: fonts.headingBold, fontSize: 21, letterSpacing: 3 },
  companyBlock: { alignItems: "center", borderBottomColor: "#303030", borderBottomWidth: 1, flexDirection: "row", gap: 11, marginTop: 34, paddingBottom: 24 },
  companyCopy: { flex: 1, gap: 2 },
  companyName: { color: colors.paper, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  companyMeta: { color: "#929292", fontFamily: fonts.body, fontSize: 11 },
  navList: { gap: 6, marginTop: 24 },
  navItem: { alignItems: "center", borderRadius: 9, flexDirection: "row", gap: 12, minHeight: 44, paddingHorizontal: 12 },
  navItemActive: { backgroundColor: colors.yellow },
  navText: { color: "#B9B9B9", fontFamily: fonts.bodyMedium, fontSize: 13 },
  navTextActive: { color: colors.ink, fontFamily: fonts.bodySemiBold },
  futureBlock: { borderTopColor: "#303030", borderTopWidth: 1, gap: 14, marginTop: 28, paddingHorizontal: 12, paddingTop: 22 },
  futureLabel: { color: "#666666", fontFamily: fonts.bodySemiBold, fontSize: 9, letterSpacing: 1.3 },
  futureItem: { color: "#686868", fontFamily: fonts.body, fontSize: 12 },
  demoNotice: { alignItems: "center", borderColor: "#353535", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 9, marginTop: "auto", padding: 12 },
  demoNoticeText: { color: "#AFAFAF", flex: 1, fontFamily: fonts.body, fontSize: 11, lineHeight: 16 },
  desktopMain: { backgroundColor: colors.canvas, flex: 1 },
  desktopScroll: { minHeight: "100%", padding: 42 },
  desktopHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  headerCopy: { gap: 6 },
  eyebrow: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1.4 },
  desktopTitle: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 32, letterSpacing: -0.8 },
  desktopSubtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
  desktopContent: { gap: 20, maxWidth: 1240, width: "100%" },
  mobileRoot: { backgroundColor: colors.ink, flex: 1 },
  mobileTopbar: { alignItems: "center", backgroundColor: colors.ink, flexDirection: "row", height: 62, justifyContent: "space-between", paddingHorizontal: 20 },
  mobileTopActions: { alignItems: "center", flexDirection: "row", gap: 10 },
  mobileMain: { backgroundColor: colors.canvas, flex: 1 },
  mobileScroll: { gap: 18, paddingBottom: 116, paddingHorizontal: 16, paddingTop: 24 },
  mobileHeader: { gap: 5 },
  mobileTitle: { color: colors.ink, fontFamily: fonts.headingBold, fontSize: 27, letterSpacing: -0.5 },
  mobileSubtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  mobileAction: { marginTop: 11 },
  bottomNav: { alignItems: "center", alignSelf: "center", backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 18, borderWidth: 1, bottom: 14, flexDirection: "row", height: 68, justifyContent: "space-around", left: 14, paddingHorizontal: 5, position: "absolute", right: 14, shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
  bottomItem: { alignItems: "center", flex: 1, gap: 2, justifyContent: "center" },
  bottomIcon: { alignItems: "center", borderRadius: 15, height: 30, justifyContent: "center", width: 38 },
  bottomIconActive: { backgroundColor: colors.yellow },
  bottomLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 9 },
  bottomLabelActive: { color: colors.ink },
});
