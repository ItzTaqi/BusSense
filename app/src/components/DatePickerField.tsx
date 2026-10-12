import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Modal, Pressable, SafeAreaView, Text, View } from "react-native";
import { MONTHS, YMD, daysInMonth, firstWeekday, formatMDY, isFuture } from "../lib/dates";
import { radius, useTheme } from "../theme";

// Pop-out calendar for birthdays: tap the field, tap the year to jump, tap a day.
export function DatePickerField({ label, value, onChange }: { label: string; value: YMD | null; onChange: (v: YMD) => void }) {
  const c = useTheme();
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [yearMode, setYearMode] = useState(false);
  const [vy, setVy] = useState(value?.y ?? now.getFullYear() - 14);
  const [vm, setVm] = useState((value?.m ?? 1) - 1);

  const shift = (dm: number) => {
    const t = vy * 12 + vm + dm;
    setVy(Math.floor(t / 12)); setVm(((t % 12) + 12) % 12);
  };
  const lead = firstWeekday(vy, vm);
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth(vy, vm) }, (_, i) => i + 1)];
  const years = Array.from({ length: 100 }, (_, i) => now.getFullYear() - i);
  const nextDisabled = vy * 12 + vm >= now.getFullYear() * 12 + now.getMonth();

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value ? formatMDY(value) : "not chosen"}. Opens calendar`}
        onPress={() => setOpen(true)}
        style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 14,
          borderRadius: radius - 6, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.card }}>
        <Ionicons name="calendar" size={20} color={c.primary} />
        <Text style={{ fontSize: 19, fontWeight: "700", color: value ? c.ink : c.sub }}>{value ? formatMDY(value) : "MM/DD/YYYY"}</Text>
      </Pressable>
      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close calendar" onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.card, borderRadius: radius + 4, padding: 16, gap: 12, maxHeight: "85%" }}>
            <SafeAreaView>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={yearMode} onPress={() => shift(-1)} style={{ padding: 10, opacity: yearMode ? 0.2 : 1 }}>
                  <Ionicons name="chevron-back" size={24} color={c.ink} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${MONTHS[vm]} ${vy}. Choose year`} onPress={() => setYearMode(!yearMode)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 8 }}>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: c.ink }}>{MONTHS[vm]} {vy}</Text>
                  <Ionicons name={yearMode ? "chevron-up" : "chevron-down"} size={18} color={c.primary} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={yearMode || nextDisabled} onPress={() => shift(1)} style={{ padding: 10, opacity: yearMode || nextDisabled ? 0.2 : 1 }}>
                  <Ionicons name="chevron-forward" size={24} color={c.ink} />
                </Pressable>
              </View>
              {yearMode ? (
                <FlatList data={years} numColumns={4} keyExtractor={(y) => String(y)} style={{ maxHeight: 320 }} initialScrollIndex={Math.max(0, now.getFullYear() - vy - 4)}
                  getItemLayout={(_, i) => ({ length: 52, offset: 52 * Math.floor(i / 4), index: i })}
                  renderItem={({ item }) => (
                    <Pressable accessibilityRole="button" accessibilityLabel={String(item)} onPress={() => { setVy(item); setYearMode(false); }}
                      style={{ flex: 1, height: 48, margin: 2, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: item === vy ? c.brand : "transparent" }}>
                      <Text style={{ fontSize: 17, fontWeight: "700", color: item === vy ? c.onBrand : c.ink }}>{item}</Text>
                    </Pressable>
                  )} />
              ) : (
                <View>
                  <View style={{ flexDirection: "row" }}>
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <Text key={i} style={{ width: `${100 / 7}%`, textAlign: "center", fontSize: 14, fontWeight: "700", color: c.sub, paddingVertical: 6 }}>{d}</Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {cells.map((d, i) => {
                      const sel = d !== null && value?.y === vy && value?.m === vm + 1 && value?.d === d;
                      const future = d !== null && isFuture({ y: vy, m: vm + 1, d });
                      return (
                        <View key={i} style={{ width: `${100 / 7}%`, alignItems: "center", paddingVertical: 2 }}>
                          {d !== null && (
                            <Pressable accessibilityRole="button" accessibilityLabel={`${MONTHS[vm]} ${d}, ${vy}`} accessibilityState={{ selected: sel, disabled: future }}
                              disabled={future} onPress={() => { onChange({ y: vy, m: vm + 1, d }); setOpen(false); }}
                              style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: sel ? c.brand : "transparent", opacity: future ? 0.25 : 1 }}>
                              <Text style={{ fontSize: 17, fontWeight: sel ? "800" : "500", color: sel ? c.onBrand : c.ink }}>{d}</Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
