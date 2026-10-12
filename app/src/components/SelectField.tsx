import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { useTheme } from "../theme";
import { fieldBox } from "./Ui";

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
        style={[fieldBox(c, open, !!disabled), { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, textAlign: "center", color: value ? c.ink : c.sub, paddingLeft: 20 }}>
          {value || placeholder || label}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.sub} />
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={{ padding: 16, gap: 12, flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700", color: c.ink }}>{label}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={{ padding: 8 }}>
                <Ionicons name="close" size={26} color={c.ink} />
              </Pressable>
            </View>
            <TextInput accessibilityLabel={`Search ${label}`} placeholder="Search" placeholderTextColor={c.sub} value={q} onChangeText={setQ}
              style={fieldBox(c)} />
            <FlatList data={shown} keyExtractor={(o) => o} keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.line }} />}
              renderItem={({ item }) => (
                <Pressable accessibilityRole="button" onPress={() => pick(item)} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 6 }}>
                  <Text style={{ fontSize: 16, color: item === value ? c.primary : c.ink, fontWeight: item === value ? "700" : "400" }}>{item}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ fontSize: 16, color: c.sub, textAlign: "center", padding: 24 }}>No matches.</Text>}
              ListFooterComponent={otherLabel ? (
                <Pressable accessibilityRole="button" onPress={() => pick("__other__")} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 6 }}>
                  <Text style={{ fontSize: 15, color: c.primary, fontWeight: "600" }}>{otherLabel}</Text>
                </Pressable>
              ) : null} />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
