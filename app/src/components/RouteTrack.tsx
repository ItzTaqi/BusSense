import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { onHero } from "../theme";

// A line of stops on a dark hero: the bus marker sits `stopsAway` dots before "your stop".
export function RouteTrack({ stopsAway }: { stopsAway: number | null }) {
  if (stopsAway === null) return null;
  const n = Math.min(stopsAway, 6) + 1; // last dot = your stop
  return (
    <View accessible accessibilityLabel={`The bus is ${stopsAway} stops away from your stop`} style={{ gap: 8, alignSelf: "stretch" }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {Array.from({ length: n }, (_, i) => {
          const last = i === n - 1;
          return (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", flex: last ? undefined : 1, flexShrink: last ? 0 : 1 }}>
              {i === 0 ? (
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: onHero.fg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="bus" size={20} color="#0B3FBF" />
                </View>
              ) : last ? (
                <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: onHero.fg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="home" size={18} color={onHero.fg} />
                </View>
              ) : (
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: onHero.dim }} />
              )}
              {!last && <View style={{ flex: 1, height: 4, marginHorizontal: 4, borderRadius: 2, backgroundColor: i === 0 ? onHero.fg : onHero.faint }} />}
            </View>
          );
        })}
      </View>
      <Text style={{ color: onHero.dim, fontSize: 14, fontWeight: "700", textAlign: "center" }}>
        {stopsAway === 0 ? "Your stop is next" : `${stopsAway} stop${stopsAway === 1 ? "" : "s"} away`}
      </Text>
    </View>
  );
}
