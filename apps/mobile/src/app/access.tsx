import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/app-shell";
import { Avatar, Button, Card, Pill, SectionTitle } from "../components/ui";
import { useHydratedWindowWidth } from "../hooks/use-hydrated-window-width";
import { colors, fonts } from "../lib/theme";

const members = [
  { initials: "SB", name: "Santiago Bustamante", role: "Administrador" },
  { initials: "JV", name: "José Vázquez", role: "Aprobador" },
];

export default function AccessScreen() {
  const desktop = useHydratedWindowWidth() >= 900;
  return (
    <AppShell title="Acceso de la empresa" subtitle="Consulta usuarios, aprobaciones y controles de la cuenta demo." action={<Button disabled label="Invitar usuario" onPress={() => undefined} />}>
      <Card style={styles.notice}>
        <Pill tone="yellow">SOLO LECTURA</Pill>
        <Text style={styles.noticeText}>La gestión está visible para comunicar el alcance del producto. Los cambios están desactivados en esta demo.</Text>
      </Card>
      <View style={[styles.grid, !desktop && styles.gridMobile]}>
        <View style={styles.column}>
          <SectionTitle title="Usuarios" />
          <Card style={styles.flushCard}>
            {members.map((member, index) => (
              <View key={member.name} style={[styles.member, index > 0 && styles.border]}>
                <Avatar label={member.initials} />
                <View style={styles.copy}><Text style={styles.name}>{member.name}</Text><Text style={styles.meta}>{member.role}</Text></View>
                <Pill tone="success">Activo</Pill>
              </View>
            ))}
          </Card>
        </View>
        <View style={styles.column}>
          <SectionTitle title="Aprobaciones y seguridad" />
          <Card style={styles.controls}>
            <Control icon="people-outline" label="Pagos mayores a 100,000 MXN" value="Doble aprobación" />
            <Control icon="finger-print-outline" label="Acceso biométrico" value="Activado" />
            <Control disabled icon="key-outline" label="Inicio de sesión empresarial" value="Próximamente" />
          </Card>
        </View>
      </View>
    </AppShell>
  );
}

function Control({ disabled, icon, label, value }: { disabled?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View accessibilityState={{ disabled }} style={[styles.control, disabled && styles.controlDisabled]}>
      <View style={styles.controlIcon}><Ionicons color={colors.ink} name={icon} size={18} /></View>
      <View style={styles.copy}><Text style={styles.name}>{label}</Text><Text style={styles.meta}>{value}</Text></View>
      <Ionicons color={colors.muted} name={disabled ? "lock-closed-outline" : "checkmark-circle-outline"} size={19} />
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { alignItems: "center", flexDirection: "row", gap: 12 },
  noticeText: { color: colors.inkSoft, flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: "row", gap: 20 },
  gridMobile: { flexDirection: "column" },
  column: { flex: 1, gap: 12, minWidth: 0 },
  flushCard: { padding: 0 },
  member: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 78, paddingHorizontal: 16 },
  border: { borderTopColor: colors.line, borderTopWidth: 1 },
  copy: { flex: 1, gap: 4 },
  name: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  controls: { gap: 10, padding: 12 },
  control: { alignItems: "center", backgroundColor: colors.canvas, borderRadius: 10, flexDirection: "row", gap: 11, minHeight: 64, padding: 12 },
  controlDisabled: { opacity: 0.48 },
  controlIcon: { alignItems: "center", backgroundColor: colors.paper, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
});
