import { Alert, Text, View } from "react-native";
import { Btn } from "../components/Ui";
import { deleteAccount } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/store";
import { useTheme } from "../theme";

// Privacy & Terms, written as plain numbered sections. It only describes what the app does today.
const SUMMARY = [
  "A bus is shown to parents only when 3 or more riders are on it.",
  "Your location is tied to a random trip code, never to your name.",
  "Location points are deleted when your trip ends, and always within 6 hours.",
  "No ads, no analytics, no selling your data, no chat.",
];

const SECTIONS: { title: string; body: string[] }[] = [
  { title: "Who can use GoNC", body: [
    "Riders must be 13 or older. If you are under 13 you cannot share your location; a parent or guardian can use Parent mode instead.",
    "Parent mode is for parents and guardians following a child's bus." ] },
  { title: "What we collect from riders", body: [
    "Your birth year (your full birthday never leaves your phone), school, district code, bus number, student ID number and the times your bus usually runs.",
    "Your student ID is used only to find your assigned bus. It is stored with your account and is never shown to other people." ] },
  { title: "What we collect from parents", body: [
    "The bus number, stop and walking time you enter so we can work out when to alert you. Your child's name or nickname stays on your phone and is not sent to us." ] },
  { title: "Location", body: [
    "We use your location only during your bus times, and only while your phone looks like it is on a bus. A notification shows when the app is listening.",
    "Each trip gets a new random code made on your phone. Location points carry that code, not your name or account, and are kept in a separate place from your account details." ] },
  { title: "What other people see", body: [
    "Parents see an anonymous bus position and estimated arrival, never an individual rider. A bus appears only when at least 3 riders are on it. Positions are rounded to about 50 meters.",
    "The estimate can be wrong. Each one is labeled LIVE, RECENT, ESTIMATE or NO DATA so you can tell how reliable it is." ] },
  { title: "How long we keep data", body: [
    "Raw location points are deleted when your trip ends, and no later than 6 hours after they were recorded. After that we keep only anonymous timing data about how long each part of a route takes.",
    "Parent reports (\"Bus didn't come\", \"Bus came early\") contain no personal details and are deleted after 30 days." ] },
  { title: "What we never do", body: [
    "We show no ads, use no analytics tools, do not sell or share your data, do not build profiles, and have no chat or free-text posting between users." ] },
  { title: "AI weekly report", body: [
    "If a parent taps \"Write AI report\", only the total number of reports, this week's and last week's counts and the busiest weekday are sent to an AI service to write two sentences. No names, locations or IDs are included. It never runs on its own." ] },
  { title: "Your choices", body: [
    "You can turn off sharing at any time with \"Not riding today\" or by ending your trip. Deleting your account removes your profile and student ID. Location points are not linked to your account, so they cannot be traced back to you and are deleted on the schedule above." ] },
  { title: "Not the official tracker", body: [
    "GoNC is a community supplement and is not the official school district tracker. Do not rely on it for safety decisions. Check with your school or transportation office when in doubt." ] },
  { title: "Changes to these terms", body: [
    "If we change how GoNC handles data we will update this page before the change takes effect. This is a draft for a prototype and should be reviewed by a school or legal adviser before a public launch." ] },
];

export function Privacy() {
  const c = useTheme();
  const set = useApp((s) => s.set);
  const del = () => Alert.alert("Delete account?", "This removes your profile and student ID. Trip points are already anonymous.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => { await deleteAccount(); await supabase.auth.signOut(); set({ mode: null }); } },
  ]);
  return (
    <View style={{ padding: 22, gap: 22 }}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "800", letterSpacing: -0.6, color: c.ink }}>Privacy and Terms</Text>
        <Text style={{ fontSize: 13, color: c.sub }}>Draft · October 12, 2026</Text>
      </View>

      <View style={{ padding: 16, borderRadius: 16, backgroundColor: c.cardAlt, gap: 10 }}>
        <Text accessibilityRole="header" style={{ fontSize: 15, fontWeight: "800", color: c.ink }}>The short version</Text>
        {SUMMARY.map((t) => (
          <View key={t} style={{ flexDirection: "row", gap: 10 }}>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.primary }}>•</Text>
            <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: c.ink }}>{t}</Text>
          </View>
        ))}
      </View>

      {SECTIONS.map((s, i) => (
        <View key={s.title} style={{ gap: 8, paddingTop: 20, borderTopWidth: 1, borderColor: c.line }}>
          <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "800", color: c.ink }}>{i + 1}. {s.title}</Text>
          {s.body.map((p) => <Text key={p} style={{ fontSize: 15, lineHeight: 23, color: c.sub }}>{p}</Text>)}
        </View>
      ))}

      <View style={{ gap: 10, paddingTop: 20, borderTopWidth: 1, borderColor: c.line }}>
        <Btn danger icon="trash" label="Delete my account" onPress={del} />
      </View>
    </View>
  );
}
