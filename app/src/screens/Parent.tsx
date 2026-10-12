import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ReportButtons } from "../components/ReportButtons";
import { RouteTrack } from "../components/RouteTrack";
import { Badge, Card, Hero } from "../components/Ui";
import { DEMO_STEPS } from "../demo/scenario";
import { StatusRow, subscribeStatus } from "../lib/api";
import { leaveByMinutes, sourceLabel } from "../lib/leaveBy";
import { Child, useApp } from "../state/store";
import { useTheme } from "../theme";
import { AlertsSettings } from "./AlertsSettings";
import { WeeklyReport } from "./WeeklyReport";

const DEMO_CHILD: Child = { id: "demo", name: "Demo", city: "Cary", school: "Demo High", districtCode: "67500", bus: "DEMO-12", stop: "demo-3", walkMin: 3 };

// Parent interface: "Today" shows the followed child's bus; Alerts and Weekly report use the same child.
export function Parent({ tab }: { tab: string }) {
  const c = useTheme();
  const { demo, children, activeChild, setActiveChild } = useApp();
  const child: Child | undefined = demo ? DEMO_CHILD : children[Math.min(activeChild, children.length - 1)];
  const [row, setRow] = useState<StatusRow | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!demo) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, DEMO_STEPS.length - 1)), 4000);
    return () => clearInterval(id);
  }, [demo]);
  useEffect(() => { if (demo) setRow(DEMO_STEPS[step]); }, [demo, step]);
  useEffect(() => {
    if (demo || !child) return;
    setRow(null);
    return subscribeStatus(child.bus, child.stop, setRow);
  }, [demo, child?.id, child?.bus, child?.stop]);

  if (!child) return <View style={{ flex: 1, padding: 24, justifyContent: "center" }}><Text style={{ textAlign: "center", color: c.sub }}>No child added yet. Open Settings to add one.</Text></View>;
  if (tab === "alerts") return <AlertsSettings route={child.bus} stop={child.stop} />;
  if (tab === "report") return <WeeklyReport route={child.bus} />;

  const hasEta = row?.eta_min != null;
  const leave = row ? leaveByMinutes(row.eta_lo, child.walkMin) : null;
  const day = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.sub }}>{day}</Text>
        <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "800", letterSpacing: -0.6, color: c.ink }}>{child.name}'s bus</Text>
      </View>

      {!demo && children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {children.map((k, i) => {
            const on = i === activeChild;
            return (
              <Pressable key={k.id} accessibilityRole="button" accessibilityLabel={`${k.name}, bus ${k.bus}`} accessibilityState={{ selected: on }} onPress={() => setActiveChild(i)}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? c.brand : c.cardAlt }}>
                <Ionicons name="person-circle" size={18} color={on ? c.onBrand : c.primary} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: on ? c.onBrand : c.ink }}>{k.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Hero>
        <Text style={{ fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>Bus {child.bus} · {child.school || "School"}</Text>
        <Badge text={sourceLabel(row?.source ?? "NO_DATA")} />
        {hasEta ? (
          <>
            <Text accessibilityLabel={`Arrives in about ${row!.eta_min} minutes`} style={{ fontSize: 60, fontWeight: "800", color: "#fff", letterSpacing: -2, lineHeight: 66, textAlign: "center" }}>
              {row!.eta_min}<Text style={{ fontSize: 22, letterSpacing: 0 }}> min</Text>
            </Text>
            <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.92)", textAlign: "center" }}>Likely between {row!.eta_lo} and {row!.eta_hi} min</Text>
          </>
        ) : (
          <Text style={{ fontSize: 15, lineHeight: 22, color: "#fff", textAlign: "center", paddingVertical: 8 }}>
            Not on the map yet. A bus shows once 3 or more riders are aboard.
          </Text>
        )}
        <RouteTrack stopsAway={row?.stops_away ?? null} />
      </Hero>

      {leave !== null && (
        <View accessible style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, backgroundColor: c.brand }}>
          <Ionicons name="walk" size={30} color={c.onBrand} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.onBrand }}>{leave === 0 ? "Leave now" : `Leave in about ${leave} min`}</Text>
            <Text style={{ fontSize: 13, color: c.onBrand, opacity: 0.85 }}>{child.stop} · {child.walkMin} min walk + 2 min cushion</Text>
          </View>
        </View>
      )}

      <Card title="Did something go wrong?" icon="megaphone">
        <ReportButtons route={child.bus} stop={child.stop} />
      </Card>
    </ScrollView>
  );
}
