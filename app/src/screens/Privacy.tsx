import { useState } from "react";
import { View } from "react-native";
import { DeleteAccountModal } from "../components/DeleteAccountModal";
import { TermsContent } from "../components/TermsContent";
import { Btn } from "../components/Ui";

export function Privacy() {
  const [confirming, setConfirming] = useState(false);
  return (
    <View style={{ padding: 22, gap: 24 }}>
      <TermsContent />
      <View style={{ gap: 10, paddingTop: 8 }}>
        <Btn danger icon="trash" label="Delete my account" onPress={() => setConfirming(true)} />
      </View>
      <DeleteAccountModal visible={confirming} onClose={() => setConfirming(false)} />
    </View>
  );
}
