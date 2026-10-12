import { useEffect, useState } from "react";
import { Card, H, P, Screen } from "../components/Ui";
import { getReceipt } from "../lib/api";
import { useApp } from "../state/store";

export function Receipt() {
  const token = useApp((s) => s.tripToken);
  const [r, setR] = useState<{ published: boolean; max_riders: number; points_kept: number } | null>(null);
  useEffect(() => { if (token) getReceipt(token).then(setR); }, [token]);
  return (
    <Screen>
      <H>Trip receipt</H>
      <Card>
        <P>{r ? (r.published ? "A bus was published." : "No bus was published.") : "Loading…"}</P>
        <P>Most riders seen: {r?.max_riders ?? "–"}</P>
        <P>{r ? `${r.points_kept} location points kept` : ""}</P>
      </Card>
    </Screen>
  );
}
