import { Alert, View } from "react-native";
import { Btn } from "../components/Ui";
import { TermsContent } from "../components/TermsContent";
import { deleteAccount } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/store";

export function Privacy() {
  const set = useApp((s) => s.set);
  const del = () => Alert.alert("Delete account?", "This removes your profile and student ID. Trip points are already anonymous.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => { await deleteAccount(); await supabase.auth.signOut(); set({ mode: null }); } },
  ]);
  return (
    <View style={{ padding: 22, gap: 24 }}>
      <TermsContent />
      <View style={{ gap: 10, paddingTop: 8 }}>
        <Btn danger icon="trash" label="Delete my account" onPress={del} />
      </View>
    </View>
  );
}
