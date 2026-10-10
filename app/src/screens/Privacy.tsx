import { Alert, ScrollView } from "react-native";
import { Btn, H, P } from "../components/Ui";
import { deleteAccount } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/store";

export function Privacy() {
  const set = useApp((s) => s.set);
  const del = () => Alert.alert("Delete account?", "This removes your profile. Trip points are already anonymous.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => { await deleteAccount(); await supabase.auth.signOut(); set({ mode: null }); } },
  ]);
  return (
    <ScrollView contentContainerStyle={{ gap: 14, padding: 16 }}>
      <H>Privacy center</H>
      <P>• A bus is shown only when 3+ riders are on it.</P>
      <P>• Your location uses a random trip code, never your name or account.</P>
      <P>• Listening happens only in your bus windows and shows "Listening".</P>
      <P>• Points are deleted when your trip ends (6 hour maximum).</P>
      <P>• Parents see the bus position delayed 15 s and rounded to 50 m.</P>
      <P>• No ads, no analytics, no chat.</P>
      <Btn danger label="Delete my account" onPress={del} />
    </ScrollView>
  );
}
