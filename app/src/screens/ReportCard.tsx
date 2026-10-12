import { useEffect, useState } from "react";
import { View } from "react-native";
import { Card, H, P } from "../components/Ui";
import { supabase } from "../lib/supabase";

export function ReportCard({ route }: { route: string }) {
  const [r, setR] = useState<{ weeks: number; no_show_reports: number; early_reports: number } | null>(null);
  useEffect(() => { supabase.functions.invoke(`route-report/${encodeURIComponent(route)}/report?weeks=4`, { method: "GET" }).then(({ data }) => setR(data)); }, [route]);
  return (
    <View style={{ gap: 14 }}>
      <H>Report card · Bus {route}</H>
      <P dim>Last {r?.weeks ?? 4} weeks, from parent reports only:</P>
      <Card>
        <P>"Bus didn't come" reports: {r?.no_show_reports ?? "–"}</P>
        <P>"Came early" reports: {r?.early_reports ?? "–"}</P>
      </Card>
    </View>
  );
}
