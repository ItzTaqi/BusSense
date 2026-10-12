import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { deleteEverything } from "../lib/account";
import { endTrip } from "../lib/tripService";
import { useApp } from "../state/store";
import { radius, useTheme } from "../theme";
import { Btn } from "./Ui";

const DELETED = [
  "Your profile: birth year, school, district code, bus number, student ID and your usual bus times.",
  "Everything saved on this phone: children you follow, past rides, alert settings and preferences.",
  "Your agreement to the Terms. You will be asked again if you come back.",
];
const STAYS = [
  "Location points are never linked to your account, so they cannot be found or deleted by account. They are already deleted when a trip ends, and always within 6 hours.",
  "Reports you sent (\"Bus didn't come\" or \"Bus came early\") and anonymous bus timing data cannot be traced to you, so they stay.",
];
const BEFORE = [
  "If you are on a trip right now, it will end.",
  "This cannot be undone. To use GoNC again you will need to set up from the start.",
];

// "Are you sure?" with the facts first. The delete button stays off until the box is ticked.
export function DeleteAccountModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme();
  const [checked, setChecked] = useState(false);
  const [state, setState] = useState<"idle" | "deleting" | "error">("idle");
  const { tripToken, resetAll } = useApp();

  const close = () => { if (state !== "deleting") { setChecked(false); setState("idle"); onClose(); } };
  const confirm = async () => {
    setState("deleting");
    if (tripToken) { try { await endTrip(); } catch { /* the points are deleted by the server schedule anyway */ } }
    const r = await deleteEverything();
    if (!r.ok) { setState("error"); return; }
    resetAll();
    setChecked(false); setState("idle"); onClose();
  };

  const list = (title: string, items: string[], icon: keyof typeof Ionicons.glyphMap) => (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ fontSize: 14, fontWeight: "800", color: c.ink }}>{title}</Text>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: "row", gap: 10 }}>
          <Ionicons name={icon} size={18} color={c.sub} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.ink }}>{t}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 18 }}>
        <View accessibilityViewIsModal style={{ maxHeight: "92%", backgroundColor: c.card, borderRadius: radius + 6, overflow: "hidden" }}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
            <View style={{ alignItems: "center", gap: 10 }}>
              <View accessible={false} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="warning" size={28} color={c.danger} />
              </View>
              <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "800", textAlign: "center", color: c.ink }}>Delete your account?</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, textAlign: "center", color: c.sub }}>Please read this first. Deleting is permanent.</Text>
            </View>
            {list("What will be deleted", DELETED, "trash-outline")}
            {list("What stays", STAYS, "shield-checkmark-outline")}
            {list("Before you go", BEFORE, "alert-circle-outline")}

            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel="I understand this cannot be undone" onPress={() => state !== "deleting" && setChecked(!checked)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: c.cardAlt }}>
              <Ionicons name={checked ? "checkbox" : "square-outline"} size={26} color={checked ? c.primary : c.sub} />
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.ink }}>I understand this cannot be undone.</Text>
            </Pressable>

            {state === "error" && (
              <Text accessibilityLiveRegion="polite" style={{ fontSize: 14, lineHeight: 20, textAlign: "center", color: c.danger }}>
                Couldn't delete your account. Check your connection and try again. Nothing was deleted.
              </Text>
            )}
            <View style={{ gap: 10 }}>
              <Btn danger icon="trash" label={state === "deleting" ? "Deleting…" : state === "error" ? "Try again" : "Delete everything"} disabled={!checked || state === "deleting"} onPress={confirm} />
              <Btn label="Keep my account" disabled={state === "deleting"} onPress={close} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
