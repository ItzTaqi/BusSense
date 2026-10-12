import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { radius, useTheme } from "../theme";

// A dropdown for students: tap, search or scroll, tap again. Optional "not listed" escape hatch.
export function SelectField({ label, value, options, onSelect, disabled, placeholder, otherLabel }: {
  label: string; value: string; options: string[]; onSelect: (v: string) => void;
  disabled?: boolean; placeholder?: string; otherLabel?: string;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const shown = useMemo(() => options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase())), [options, q]);
  const close = () => { setOpen(false); setQ(""); };
  const pick = (v: string) => { onSelect(v); close(); };
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || "not chosen"}`} accessibilityState={{ disabled: !!disabled }}
        disabled={disabled} onPress={() => setOpen(true)}
        style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14,
          borderRadius: radius - 6, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.card, opacity: disabled ? 0.45 : 1 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, textAlign: "center", color: value ? c.ink : c.sub, paddingLeft: 22 }}>
          {value || placeholder || label}
        </Text>
        <Ionicons name="chevron-down" size={20} color={c.sub} />
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={{ padding: 16, gap: 12, flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "800", color: c.ink }}>{label}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={{ padding: 8 }}>
                <Ionicons name="close" size={26} color={c.ink} />
              </Pressable>
            </View>
            <TextInput accessibilityLabel={`Search ${label}`} placeholder="Search" placeholderTextColor={c.sub} value={q} onChangeText={setQ}
              style={{ fontSize: 17, minHeight: 48, borderRadius: radius - 6, borderWidth: 1.5, borderColor: c.line, paddingHorizontal: 14, color: c.ink, backgroundColor: c.card }} />
            <FlatList data={shown} keyExtractor={(o) => o} keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.line }} />}
              renderItem={({ item }) => (
                <Pressable accessibilityRole="button" onPress={() => pick(item)} style={{ minHeight: 54, justifyContent: "center", paddingHorizontal: 6 }}>
                  <Text style={{ fontSize: 18, color: c.ink, fontWeight: item === value ? "800" : "500" }}>{item}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ fontSize: 16, color: c.sub, textAlign: "center", padding: 24 }}>No matches.</Text>}
              ListFooterComponent={otherLabel ? (
                <Pressable accessibilityRole="button" onPress={() => pick("__other__")} style={{ minHeight: 54, justifyContent: "center", paddingHorizontal: 6 }}>
                  <Text style={{ fontSize: 17, color: c.primary, fontWeight: "700" }}>{otherLabel}</Text>
                </Pressable>
              ) : null} />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
