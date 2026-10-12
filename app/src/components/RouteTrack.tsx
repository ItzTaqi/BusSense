import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { palette } from "../theme";

// A little line of stops: the bus marker sits `stopsAway` dots before "your stop".
export function RouteTrack({ stopsAway }: { stopsAway: number | null }) {
  if (stopsAway === null) return null;
  const n = Math.min(stopsAway, 6) + 1; // last dot = your stop
  return (
    <View accessible accessibilityLabel={`The bus is ${stopsAway} stops away from your stop`} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {Array.from({ length: n }, (_, i) => {
          const last = i === n - 1;
          return (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", flex: last ? undefined : 1, flexShrink: last ? 0 : 1 }}>
              {i === 0 ? (
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: palette.sun, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="bus" size={20} color={palette.navy} />
                </View>
              ) : last ? (
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: palette.mint, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="home" size={18} color={palette.navy} />
                </View>
              ) : (
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.5)" }} />
              )}
              {!last && <View style={{ flex: 1, height: 4, marginHorizontal: 4, borderRadius: 2, backgroundColor: i === 0 ? palette.sun : "rgba(255,255,255,0.25)" }} />}
            </View>
          );
        })}
      </View>
      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "700" }}>
        {stopsAway === 0 ? "Your stop is next" : `${stopsAway} stop${stopsAway === 1 ? "" : "s"} away`}
      </Text>
    </View>
  );
}
