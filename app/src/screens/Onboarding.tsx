import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Btn, ProgressBar } from "../components/Ui";
import { SelectField } from "../components/SelectField";
import { CITIES, schoolsIn } from "../data/schools";
import { canEnableSensing } from "../lib/tripToken";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/store";
import { radius, useTheme } from "../theme";

const TOTAL = 5;

export function Onboarding() {
  const set = useApp((s) => s.set);
  const c = useTheme();
  const [step, setStep] = useState(0);
  const [year, setYear] = useState("");
  const [city, setCity] = useState("");
  const [school, setSchool] = useState("");
  const [otherSchool, setOtherSchool] = useState(false);
  const [bus, setBus] = useState("");
  const [stop, setStop] = useState("");
  const [amStart, setAmStart] = useState("06:45");
  const [amEnd, setAmEnd] = useState("07:30");
  const [pmStart, setPmStart] = useState("14:30");
  const [pmEnd, setPmEnd] = useState("16:30");
  const can = year.length === 4 && canEnableSensing(Number(year));
  const schoolId = city && school ? `${city} · ${school}` : "";

  const finish = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("riders").upsert({
        id: data.user.id, birth_year: Number(year), school_id: schoolId, declared_bus: bus,
        am_stop_id: stop, pm_stop_id: stop, am_window_start: amStart, am_window_end: amEnd,
        pm_window_start: pmStart, pm_window_end: pmEnd,
      });
    }
    set({ mode: "rider", birthYear: Number(year), declaredBus: bus });
  };

  const field = { textAlign: "center" as const, fontSize: 17, minHeight: 52, borderRadius: radius - 6, borderWidth: 1.5,
    borderColor: c.line, paddingHorizontal: 14, color: c.ink, backgroundColor: c.card };
  const title = (t: string, sub?: string) => (
    <View style={{ gap: 4 }}>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "800", textAlign: "center", color: c.ink }}>{t}</Text>
      {sub ? <Text style={{ fontSize: 15, textAlign: "center", color: c.sub }}>{sub}</Text> : null}
    </View>
  );
  const time = (a: string, setA: (v: string) => void, b: string, setB: (v: string) => void, label: string) => (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: "700", textAlign: "center", color: c.sub }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput accessibilityLabel={`${label} start`} style={[field, { flex: 1 }]} value={a} onChangeText={setA} />
        <TextInput accessibilityLabel={`${label} end`} style={[field, { flex: 1 }]} value={b} onChangeText={setB} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 20, gap: 18, width: "100%", maxWidth: 420, alignSelf: "center" }}>
      <ProgressBar step={step + 1} total={TOTAL} />
      {step === 0 && (<>
        {title("Birth year", "Riders under 13 use Parent mode only.")}
        <TextInput accessibilityLabel="Birth year" placeholder="2011" placeholderTextColor={c.sub} style={field} keyboardType="number-pad"
          value={year} onChangeText={setYear} maxLength={4} />
        <Btn primary label="Next" disabled={year.length !== 4}
          onPress={() => (can ? setStep(1) : set({ mode: "parent", birthYear: Number(year) }))} />
      </>)}
      {step === 1 && (<>
        {title("Your bus")}
        <SelectField label="City" placeholder="Choose city" value={city} options={CITIES}
          onSelect={(v) => { setCity(v); setSchool(""); setOtherSchool(false); }} />
        {otherSchool ? (
          <TextInput accessibilityLabel="School name" placeholder="School name" placeholderTextColor={c.sub} style={field} value={school} onChangeText={setSchool} />
        ) : (
          <SelectField label="School" placeholder={city ? "Choose school" : "Choose a city first"} value={school} disabled={!city}
            options={schoolsIn(city)} otherLabel="My school isn't listed"
            onSelect={(v) => (v === "__other__" ? (setOtherSchool(true), setSchool("")) : setSchool(v))} />
        )}
        <TextInput accessibilityLabel="Bus number" placeholder="Bus number" placeholderTextColor={c.sub} style={field} value={bus} onChangeText={setBus} />
        <TextInput accessibilityLabel="Your stop" placeholder="Your stop" placeholderTextColor={c.sub} style={field} value={stop} onChangeText={setStop} />
        <Btn primary label="Next" disabled={!schoolId || !bus} onPress={() => setStep(2)} />
      </>)}
      {step === 2 && (<>
        {title("Bus windows", "We only listen in these times (24 h).")}
        {time(amStart, setAmStart, amEnd, setAmEnd, "Morning")}
        {time(pmStart, setPmStart, pmEnd, setPmEnd, "Afternoon")}
        <Btn primary label="Next" onPress={() => setStep(3)} />
      </>)}
      {step === 3 && (<>
        {title("Location, explained", "Only inside your bus windows. Tied to a random trip code, never your name. A bus shows only when 3+ riders agree, and your points are deleted when the trip ends.")}
        <Btn primary label="I understand" onPress={() => setStep(4)} />
      </>)}
      {step === 4 && (<>
        {title("Motion sensors", "The accelerometer helps tell a bus from a car. It stays on your phone except as one summary number.")}
        <Btn primary label="Finish setup" onPress={finish} />
      </>)}
    </View>
  );
}
