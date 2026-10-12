import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Btn, IconBubble } from "../components/Ui";
import { Ride, durationMin, outcomeText, rideTitle } from "../lib/rides";
import { clearRides, loadRides } from "../lib/ridesStore";
import { useTheme } from "../theme";

// Rides are saved on this phone only (the server holds no per-person trip list). No location points are kept for any of them.
export function PastRides() {
  const c = useTheme();
  const [rides, setRides] = useState<Ride[] | null>(null);
  useEffect(() => { loadRides().then(setRides); }, []);

  return (
    <View style={{ padding: 20, gap: 18 }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: "800", letterSpacing: -0.5, color: c.ink }}>Past rides</Text>
      {rides === null ? null : rides.length === 0 ? (
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 40 }}>
          <IconBubble name="bus" size={56} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>No rides yet</Text>
          <Text style={{ fontSize: 14, lineHeight: 20, textAlign: "center", color: c.sub, maxWidth: 280 }}>Your trips show up here after you end one.</Text>
        </View>
      ) : (<>
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
          {rides.map((r, i) => (
            <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.line }}>
              <IconBubble name={r.published ? "checkmark-circle" : "bus"} size={40} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.ink }}>{rideTitle(r)}</Text>
                <Text style={{ fontSize: 13, color: c.sub }}>Bus {r.bus} · {durationMin(r)} min</Text>
                <Text style={{ fontSize: 13, color: c.sub }}>{outcomeText(r)}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }} accessible accessibilityLabel="No location points kept">
                <Ionicons name="shield-checkmark" size={14} color={c.primary} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: c.sub }}>0 points kept</Text>
              </View>
            </View>
          ))}
        </View>
        <Btn label="Clear history" onPress={async () => { await clearRides(); setRides([]); }} />
      </>)}
    </View>
  );
}
