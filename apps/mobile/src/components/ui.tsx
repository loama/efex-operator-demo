import { Ionicons } from "@expo/vector-icons";
import { useState, type PropsWithChildren, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, fonts } from "../lib/theme";

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet";
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "quiet" && styles.buttonQuiet,
        (disabled || loading) && styles.buttonDisabled,
        focused && (variant === "primary" ? styles.buttonFocusedPrimary : styles.buttonFocusedLight),
        pressed && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.paper : colors.ink} size="small" />
      ) : (
        <>
          {icon ? <Ionicons color={variant === "primary" ? colors.paper : colors.ink} name={icon} size={17} /> : null}
          <Text style={[styles.buttonLabel, variant !== "primary" && styles.buttonLabelDark]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  const { onBlur, onFocus, ...inputProps } = props;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        placeholderTextColor={colors.quiet}
        style={[styles.field, focused && styles.fieldFocused, error ? styles.fieldError : undefined]}
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Pill({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "neutral" | "success" | "warning" | "yellow" }>) {
  return (
    <View style={[styles.pill, tone === "success" && styles.pillSuccess, tone === "warning" && styles.pillWarning, tone === "yellow" && styles.pillYellow]}>
      <Text style={[styles.pillText, tone === "success" && styles.pillTextSuccess, tone === "warning" && styles.pillTextWarning]}>{children}</Text>
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.accent} />
      </View>
      {action}
    </View>
  );
}

export function Avatar({ label, size = 40 }: { label: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{label}</Text>
    </View>
  );
}

export function LoadingState({ label = "Cargando información" }: { label?: string }) {
  return (
    <View accessibilityRole="progressbar" style={styles.state}>
      <ActivityIndicator color={colors.ink} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card style={styles.errorCard}>
      <Ionicons color={colors.red} name="alert-circle-outline" size={24} />
      <View style={styles.errorCopy}>
        <Text style={styles.errorTitle}>No pudimos cargar esta sección</Text>
        <Text style={styles.errorMessage}>{message}</Text>
      </View>
      <Button label="Reintentar" onPress={onRetry} variant="secondary" />
    </Card>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <Card style={styles.emptyCard}>
      <View style={styles.emptyIcon}><Ionicons color={colors.ink} name="sparkles-outline" size={22} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 12, borderWidth: 1, padding: 18 },
  button: { alignItems: "center", backgroundColor: colors.ink, borderColor: colors.ink, borderRadius: 999, borderWidth: 2, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 46, paddingHorizontal: 20 },
  buttonSecondary: { backgroundColor: colors.paper },
  buttonQuiet: { backgroundColor: colors.canvas, borderColor: colors.line },
  buttonDisabled: { opacity: 0.45 },
  buttonFocusedPrimary: { borderColor: colors.yellow },
  buttonFocusedLight: { borderColor: colors.inkSoft },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  buttonLabel: { color: colors.paper, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  buttonLabelDark: { color: colors.ink },
  fieldWrap: { gap: 7 },
  fieldLabel: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13 },
  field: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 10, borderWidth: 2, color: colors.ink, fontFamily: fonts.body, fontSize: 15, minHeight: 50, paddingHorizontal: 14 },
  fieldFocused: { borderColor: colors.ink },
  fieldError: { borderColor: colors.red },
  errorText: { color: colors.red, fontFamily: fonts.body, fontSize: 12 },
  pill: { alignSelf: "flex-start", backgroundColor: colors.canvas, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  pillSuccess: { backgroundColor: colors.greenSoft },
  pillWarning: { backgroundColor: colors.amberSoft },
  pillYellow: { backgroundColor: colors.yellow },
  pillText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 11 },
  pillTextSuccess: { color: colors.green },
  pillTextWarning: { color: colors.amber },
  sectionTitleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 18 },
  accent: { backgroundColor: colors.yellow, height: 3, marginTop: 5, width: 28 },
  avatar: { alignItems: "center", backgroundColor: colors.yellow, justifyContent: "center" },
  avatarText: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  state: { alignItems: "center", gap: 12, justifyContent: "center", minHeight: 240 },
  stateText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  errorCard: { alignItems: "center", gap: 14, minHeight: 180, justifyContent: "center" },
  errorCopy: { alignItems: "center", gap: 5 },
  errorTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 16 },
  errorMessage: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, textAlign: "center" },
  emptyCard: { alignItems: "center", gap: 10, minHeight: 240, justifyContent: "center" },
  emptyIcon: { alignItems: "center", backgroundColor: colors.yellow, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  emptyTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 17 },
  emptyMessage: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, maxWidth: 340, textAlign: "center" },
});
