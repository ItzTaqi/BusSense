import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SelectField } from "../components/SelectField";
import { Btn, IconBubble, Input, ProgressBar, type IconName } from "../components/Ui";
import { CITIES, schoolsIn } from "../data/schools";
import { DISTRICTS, defaultDistrictForCity, districtByLabel, districtLabel, isDistrictCode } from "../data/districts";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/store";
import { useTheme } from "../theme";

const TOTAL = 6;
const WALK_OPTIONS = Array.from({ length: 15 }, (_, i) => `${i + 1} min`);

// Parent setup: a few short screens, one question each. Finishing adds a child and opens the parent interface.
export function ParentOnboarding({ onCancel, onDone, adding }: { onCancel: () => void; onDone: () => void; adding?: boolean }) {
  const c = useTheme();
  const addChild = useApp((s) => s.addChild);
  const [step, setStep] = useState(adding ? 1 : 0);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [school, setSchool] = useState("");
  const [otherSchool, setOtherSchool] = useState(false);
  const [district, setDistrict] = useState("");
  const [otherDistrict, setOtherDistrict] = useState(false);
  const [otherCode, setOtherCode] = useState("");
  const [bus, setBus] = useState("");
  const [stop, setStop] = useState("");
  const [walk, setWalk] = useState("5 min");
  const districtCode = otherDistrict ? otherCode.trim() : districtByLabel(district)?.code ?? "";
  const walkMin = Number(walk.split(" ")[0]) || 5;

  const finish = async (askAlerts: boolean) => {
    if (askAlerts) { try { await Notifications.requestPermissionsAsync(); } catch { /* browser preview / denied */ } }
    addChild({ name: name.trim() || "My child", city, school, districtCode, bus: bus.trim(), stop: stop.trim(), walkMin });
    // Best effort: tell the server which bus/stop to alert about. No location data and no child name is sent.
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase.from("followers").upsert({ id: data.user.id, walk_min: walkMin });
        await supabase.from("follows").upsert({ follower_id: data.user.id, route_label: bus.trim(), stop_id: stop.trim() });
      }
    } catch { /* offline: everything is also saved on this phone */ }
    onDone();
  };

  const title = (t: string, sub?: string) => (
    <View style={{ gap: 6, marginTop: 4 }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: "800", letterSpacing: -0.5, textAlign: "center", color: c.ink }}>{t}</Text>
      {sub ? <Text style={{ fontSize: 14, lineHeight: 20, textAlign: "center", color: c.sub }}>{sub}</Text> : null}
    </View>
  );
  const point = (icon: IconName, text: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: c.cardAlt }}>
      <IconBubble name={icon} bg={c.card} />
      <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: c.ink }}>{text}</Text>
    </View>
  );
  const back = () => (step === 0 || (adding && step === 1) ? onCancel() : setStep(step - 1));

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 14, width: "100%", maxWidth: 420, alignSelf: "center" }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={24} color={c.primary} />
        </Pressable>
        <View style={{ flex: 1 }}><ProgressBar step={step + 1} total={TOTAL} /></View>
        <View style={{ width: 40 }} />
      </View>

      {step === 0 && (<>
        <View accessible={false} style={{ alignSelf: "center", width: 72, height: 72, borderRadius: 36, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
          <Ionicons name="people" size={36} color={c.primary} />
        </View>
        {title("Welcome, parent", "Follow your child's bus in about a minute.")}
        {point("location", "See where the bus is on the way to your stop.")}
        {point("walk", "Get a leave-by time so no one waits in the cold.")}
        {point("notifications", "Get alerts when the bus is late or has passed.")}
        <Btn primary label="Continue" onPress={() => setStep(1)} />
      </>)}

      {step === 1 && (<>
        {title("Your child", "A first name or nickname, only shown on your phone.")}
        <Input accessibilityLabel="Child's name or nickname" placeholder="Name or nickname" maxLength={20} value={name} onChangeText={setName} />
        <Btn primary label="Next" disabled={!name.trim()} onPress={() => setStep(2)} />
      </>)}

      {step === 2 && (<>
        {title("Their school")}
        <SelectField label="City" placeholder="City" value={city} options={CITIES}
          onSelect={(v) => { setCity(v); setSchool(""); setOtherSchool(false); const d = defaultDistrictForCity(v); if (d && !district) setDistrict(districtLabel(d)); }} />
        {otherSchool ? (
          <Input accessibilityLabel="School name" placeholder="School name" value={school} onChangeText={setSchool} />
        ) : (
          <SelectField label="School" placeholder={city ? "School" : "Choose a city first"} value={school} disabled={!city}
            options={schoolsIn(city)} otherLabel="My child's school isn't listed"
            onSelect={(v) => (v === "__other__" ? (setOtherSchool(true), setSchool("")) : setSchool(v))} />
        )}
        <Btn primary label="Next" disabled={!city || !school.trim()} onPress={() => setStep(3)} />
      </>)}

      {step === 3 && (<>
        {title("Their bus", "Find the district and bus number on your transportation notice.")}
        {otherDistrict ? (
          <Input accessibilityLabel="District code" placeholder="5-digit district code" keyboardType="number-pad" maxLength={5} value={otherCode} onChangeText={setOtherCode} />
        ) : (
          <SelectField label="District" placeholder="District" value={district} options={DISTRICTS.map(districtLabel)}
            otherLabel="My district isn't listed (enter code)"
            onSelect={(v) => (v === "__other__" ? (setOtherDistrict(true), setDistrict("")) : setDistrict(v))} />
        )}
        <Input accessibilityLabel="Bus number" placeholder="Bus number" maxLength={8} value={bus} onChangeText={setBus} />
        <Btn primary label="Next" disabled={!isDistrictCode(districtCode) || !bus.trim()} onPress={() => setStep(4)} />
      </>)}

      {step === 4 && (<>
        {title("Your stop", "Where does the bus pick up or drop off?")}
        <Input accessibilityLabel="Stop name" placeholder="Stop name or street" maxLength={40} value={stop} onChangeText={setStop} />
        <Text style={{ fontSize: 13, fontWeight: "600", textAlign: "center", color: c.sub }}>How long is the walk to the stop?</Text>
        <SelectField label="Walking time" value={walk} options={WALK_OPTIONS} onSelect={setWalk} />
        <Btn primary label="Next" disabled={!stop.trim()} onPress={() => setStep(5)} />
      </>)}

      {step === 5 && (<>
        <View accessible={false} style={{ alignSelf: "center", width: 72, height: 72, borderRadius: 36, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
          <Ionicons name="notifications" size={34} color={c.primary} />
        </View>
        {title("Turn on alerts?", `We'll tell you when ${name.trim() || "your child"}'s bus is nearly at the stop, running late, or has passed. At most one alert per stop every 5 minutes.`)}
        <Btn primary icon="notifications" label="Turn on alerts" onPress={() => finish(true)} />
        <Btn label="Not now" onPress={() => finish(false)} />
      </>)}
    </ScrollView>
  );
}
