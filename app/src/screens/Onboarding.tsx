import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DatePickerField } from "../components/DatePickerField";
import { SelectField } from "../components/SelectField";
import { Btn, IconBubble, Input, ProgressBar, type IconName } from "../components/Ui";
import { CITIES, schoolsIn } from "../data/schools";
import { DISTRICTS, defaultDistrictForCity, districtByLabel, districtLabel, isDistrictCode } from "../data/districts";
import { YMD } from "../lib/dates";
import { INELIGIBLE_BODY, INELIGIBLE_TITLE, isEligibleRider } from "../lib/eligibility";
import { supabase } from "../lib/supabase";
import { AFTERNOON_OPTIONS, MORNING_OPTIONS, isStudentId, parseLabel, toHHMM, windowsFromTimes } from "../lib/times";
import { useApp } from "../state/store";
import { useTheme } from "../theme";

const TOTAL = 6;

export function Onboarding({ onParent, onHome }: { onParent: () => void; onHome: () => void }) {
  const set = useApp((s) => s.set);
  const c = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [dob, setDob] = useState<YMD | null>(null);
  const [city, setCity] = useState("");
  const [school, setSchool] = useState("");
  const [otherSchool, setOtherSchool] = useState(false);
  const [district, setDistrict] = useState("");
  const [otherCode, setOtherCode] = useState("");
  const [otherDistrict, setOtherDistrict] = useState(false);
  const [bus, setBus] = useState("");
  const [studentId, setStudentId] = useState("");
  const [pickup, setPickup] = useState("");
  const [leave, setLeave] = useState("");
  const [ineligible, setIneligible] = useState(false);
  const pickupMin = parseLabel(pickup);
  const leaveMin = parseLabel(leave);
  const schoolId = city && school ? `${city} · ${school}` : "";
  const districtCode = otherDistrict ? otherCode.trim() : districtByLabel(district)?.code ?? "";
  const districtOk = isDistrictCode(districtCode);

  const finish = async () => {
    const { data } = await supabase.auth.getUser();
    const w = windowsFromTimes(pickupMin ?? 7 * 60, leaveMin ?? 15 * 60);
    if (data.user && dob && isEligibleRider(dob)) {
      await supabase.from("riders").upsert({
        id: data.user.id, birth_year: dob.y, school_id: schoolId, declared_bus: bus.trim(), district_code: districtCode,
        student_id: studentId.trim(), usual_pickup_time: toHHMM(pickupMin ?? 0), school_dismissal_time: toHHMM(leaveMin ?? 0),
        am_window_start: w.amStart, am_window_end: w.amEnd, pm_window_start: w.pmStart, pm_window_end: w.pmEnd,
      });
    }
    set({ mode: "rider", birthYear: dob?.y ?? null, declaredBus: bus.trim(), riderName: name.trim() }); // the name stays on this phone
  };

  // Ask the OS for location permission, then move on (a "no" is fine: they can allow it later in Settings).
  const askLocation = async () => {
    try { await Location.requestForegroundPermissionsAsync(); } catch { /* browser preview / denied */ }
    setStep(5);
  };

  const title = (t: string, sub?: string) => (
    <View style={{ gap: 4 }}>
      <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700", letterSpacing: -0.3, textAlign: "center", color: c.ink }}>{t}</Text>
      {sub ? <Text style={{ fontSize: 14, lineHeight: 20, textAlign: "center", color: c.sub }}>{sub}</Text> : null}
    </View>
  );
  const point = (icon: IconName, text: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, backgroundColor: c.cardAlt }}>
      <IconBubble name={icon} bg={c.card} />
      <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: c.ink }}>{text}</Text>
    </View>
  );

  if (ineligible) return (
    <View style={{ flex: 1, padding: 24, gap: 14, width: "100%", maxWidth: 420, alignSelf: "center", justifyContent: "center" }}>
      <View accessible={false} style={{ alignSelf: "center", width: 64, height: 64, borderRadius: 32, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="shield-checkmark" size={30} color={c.primary} />
      </View>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "700", textAlign: "center", color: c.ink }}>{INELIGIBLE_TITLE}</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, textAlign: "center", color: c.sub }}>{INELIGIBLE_BODY}</Text>
      <Btn primary icon="people" label="A parent can use Parent mode" onPress={onParent} />
      <Btn label="Change my birthday" onPress={() => { setIneligible(false); setDob(null); }} />
      <Btn label="Back to home" onPress={onHome} />
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 20, gap: 14, width: "100%", maxWidth: 420, alignSelf: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={step === 0 ? "Back to home" : "Back"} onPress={() => (step === 0 ? onHome() : setStep(step - 1))}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={24} color={c.primary} />
        </Pressable>
        <View style={{ flex: 1 }}><ProgressBar step={step + 1} total={TOTAL} /></View>
        <View style={{ width: 40 }} />
      </View>
      {step === 0 && (<>
        {title("What's your name?", "A first name or nickname. It only shows on your phone.")}
        <Input accessibilityLabel="Your name or nickname" placeholder="Name or nickname" maxLength={20} value={name} onChangeText={setName} />
        <Btn primary label="Next" disabled={!name.trim()} onPress={() => setStep(1)} />
      </>)}
      {step === 1 && (<>
        {title("Your birthday", "Riders under 13 use Parent mode only. Your birthday stays on your phone.")}
        <DatePickerField label="Birthday" value={dob} onChange={setDob} />
        <Btn primary label="Next" disabled={!dob} onPress={() => (dob && isEligibleRider(dob) ? setStep(2) : setIneligible(true))} />
      </>)}
      {step === 2 && (<>
        {title("Your bus")}
        <SelectField label="City" placeholder="City" value={city} options={CITIES}
          onSelect={(v) => { setCity(v); setSchool(""); setOtherSchool(false); const d = defaultDistrictForCity(v); if (d && !district) setDistrict(districtLabel(d)); }} />
        {otherSchool ? (
          <Input accessibilityLabel="School name" placeholder="School name" value={school} onChangeText={setSchool} />
        ) : (
          <SelectField label="School" placeholder={city ? "School" : "Choose a city first"} value={school} disabled={!city}
            options={schoolsIn(city)} otherLabel="My school isn't listed"
            onSelect={(v) => (v === "__other__" ? (setOtherSchool(true), setSchool("")) : setSchool(v))} />
        )}
        {otherDistrict ? (
          <Input accessibilityLabel="District code" placeholder="5-digit district code" keyboardType="number-pad" maxLength={5} value={otherCode} onChangeText={setOtherCode} />
        ) : (
          <SelectField label="District" placeholder="District" value={district} options={DISTRICTS.map(districtLabel)}
            otherLabel="My district isn't listed (enter code)"
            onSelect={(v) => (v === "__other__" ? (setOtherDistrict(true), setDistrict("")) : setDistrict(v))} />
        )}
        <Input accessibilityLabel="Bus number" placeholder="Bus number" maxLength={8} value={bus} onChangeText={setBus} />
        <Input accessibilityLabel="Student ID number" placeholder="Student ID number" keyboardType="number-pad" maxLength={12} value={studentId} onChangeText={setStudentId} />
        <Text style={{ fontSize: 12, textAlign: "center", color: c.sub }}>Your student ID is used only to find your assigned bus.</Text>
        <Btn primary label="Next" disabled={!schoolId || !districtOk || !bus.trim() || !isStudentId(studentId)} onPress={() => setStep(3)} />
      </>)}
      {step === 3 && (<>
        {title("Bus times", "We only listen around these times.")}
        <Text style={{ fontSize: 13, fontWeight: "600", textAlign: "center", color: c.sub }}>What time does your bus usually come?</Text>
        <SelectField label="Bus comes (morning)" placeholder="Choose time" value={pickup} options={MORNING_OPTIONS} onSelect={setPickup} />
        <Text style={{ fontSize: 13, fontWeight: "600", textAlign: "center", color: c.sub }}>What time does it usually leave school?</Text>
        <SelectField label="Bus leaves school (afternoon)" placeholder="Choose time" value={leave} options={AFTERNOON_OPTIONS} onSelect={setLeave} />
        <Btn primary label="Next" disabled={pickupMin === null || leaveMin === null} onPress={() => setStep(4)} />
      </>)}
      {step === 4 && (<>
        {title("Allow location")}
        {point("location", "We need your location to find your bus and the bus closest to you.")}
        {point("people", "A bus is only shown when 3+ riders are on it.")}
        {point("heart", "Your location also helps other riders find their bus.")}
        <Btn primary icon="location" label="Allow location" onPress={askLocation} />
        <Btn label="Not now" onPress={() => setStep(5)} />
      </>)}
      {step === 5 && (<>
        {title("Motion sensors", "Motion helps tell a bus from a car. It stays on your phone.")}
        <Btn primary label="Finish setup" onPress={finish} />
      </>)}
    </View>
  );
}
