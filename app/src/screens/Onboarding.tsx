import { useState } from "react";
import { TextInput, View } from "react-native";
import { Btn, H, P } from "../components/Ui";
import { canEnableSensing } from "../lib/tripToken";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/store";

export function Onboarding() {
  const set = useApp((s) => s.set);
  const [step, setStep] = useState(0);
  const [year, setYear] = useState("");
  const [school, setSchool] = useState("");
  const [bus, setBus] = useState("");
  const [stop, setStop] = useState("");
  const [amStart, setAmStart] = useState("06:45");
  const [amEnd, setAmEnd] = useState("07:30");
  const [pmStart, setPmStart] = useState("14:30");
  const [pmEnd, setPmEnd] = useState("16:30");
  const can = year.length === 4 && canEnableSensing(Number(year));

  const finish = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("riders").upsert({
        id: data.user.id, birth_year: Number(year), school_id: school, declared_bus: bus,
        am_stop_id: stop, pm_stop_id: stop, am_window_start: amStart, am_window_end: amEnd,
        pm_window_start: pmStart, pm_window_end: pmEnd,
      });
    }
    set({ mode: "rider", birthYear: Number(year), declaredBus: bus });
  };
  const field = { fontSize: 20, borderWidth: 1, padding: 12 } as const;

  return (
    <View style={{ gap: 14, padding: 16 }}>
      {step === 0 && (<>
        <H>How old are you?</H>
        <P>Birth year (e.g. 2011). Riders under 13 can only use Parent mode.</P>
        <TextInput accessibilityLabel="Birth year" style={field} keyboardType="number-pad" value={year} onChangeText={setYear} maxLength={4} />
        <Btn label="Next" disabled={year.length !== 4} onPress={() => (can ? setStep(1) : set({ mode: "parent", birthYear: Number(year) }))} />
      </>)}
      {step === 1 && (<>
        <H>Your bus</H>
        <TextInput accessibilityLabel="School" placeholder="School" style={field} value={school} onChangeText={setSchool} />
        <TextInput accessibilityLabel="Bus number" placeholder="Bus number" style={field} value={bus} onChangeText={setBus} />
        <TextInput accessibilityLabel="Stop" placeholder="Your stop" style={field} value={stop} onChangeText={setStop} />
        <Btn label="Next" disabled={!school || !bus} onPress={() => setStep(2)} />
      </>)}
      {step === 2 && (<>
        <H>Bus windows</H>
        <P>The app only listens during these times (24 h, HH:MM).</P>
        <P>Morning</P>
        <TextInput accessibilityLabel="Morning start" style={field} value={amStart} onChangeText={setAmStart} />
        <TextInput accessibilityLabel="Morning end" style={field} value={amEnd} onChangeText={setAmEnd} />
        <P>Afternoon</P>
        <TextInput accessibilityLabel="Afternoon start" style={field} value={pmStart} onChangeText={setPmStart} />
        <TextInput accessibilityLabel="Afternoon end" style={field} value={pmEnd} onChangeText={setPmEnd} />
        <Btn label="Next" onPress={() => setStep(3)} />
      </>)}
      {step === 3 && (<>
        <H>Location, explained</H>
        <P>GoYellow uses your location only inside your bus windows. It is tied to a random trip code, never your name. A bus is shown only when 3 or more riders agree, and your points are deleted when the trip ends.</P>
        <Btn label="I understand" onPress={() => setStep(4)} />
      </>)}
      {step === 4 && (<>
        <H>Motion sensors</H>
        <P>The accelerometer helps tell a bus from a car. It never leaves your phone except as a summary number.</P>
        <Btn label="Finish setup" onPress={finish} />
      </>)}
    </View>
  );
}
