import Foundation
import GoNCCore
import GoNCEngine

// gonc-sim: simulator, adversarial evaluation and classifier training. Everything is deterministic from the seed.
//   gonc-sim adversarial [runs]   false buses over N randomized runs per scenario (default 50) -> eval/out/adversarial.csv
//   gonc-sim train                trains on SYNTHETIC windows and prints the model and held-out metrics (not real accuracy)
let args = CommandLine.arguments.dropFirst()
let command = args.first ?? "help"

func writeCSV(_ path: String, _ text: String) {
    try? FileManager.default.createDirectory(atPath: (path as NSString).deletingLastPathComponent, withIntermediateDirectories: true)
    try? text.write(toFile: path, atomically: true, encoding: .utf8)
}

switch command {
case "adversarial":
    let runs = Int(args.dropFirst().first ?? "") ?? 50
    var csv = "scenario,runs,wrong,false_buses,expected_buses\n"
    for (name, run) in Scenarios.all {
        var wrong = 0, falseBuses = 0, expected = 0
        for seed in 0..<runs {
            var rng = SeededRandom(seed: UInt64(1000 + seed))
            let s = run(&rng)
            expected = s.expectedBuses
            let found = Companions.detectBuses(s.points).count
            if found != s.expectedBuses { wrong += 1 }
            if found > s.expectedBuses { falseBuses += 1 }
        }
        csv += "\(name),\(runs),\(wrong),\(falseBuses),\(expected)\n"
        print("\(name): \(wrong)/\(runs) wrong, \(falseBuses) false buses")
    }
    writeCSV("eval/out/adversarial.csv", csv)
case "train":
    let rows = SyntheticWindows.rows()
    let r = ClassifierTraining.trainAndEvaluate(rows, synthetic: true)
    print("SYNTHETIC data only: these numbers say nothing about real rides.")
    print(String(format: "held-out windows=%d precision=%.3f recall=%.3f f1=%.3f", r.testWindows, r.precision, r.recall, r.f1))
    print("confusion [tn fp fn tp] = \(r.confusion.tn) \(r.confusion.fp) \(r.confusion.fn) \(r.confusion.tp)")
    print("weights=\(r.model.weights)\nbias=\(r.model.bias)")
    writeCSV("eval/out/classifier_metrics.csv", "n,tn,fp,fn,tp,precision,recall,f1,synthetic\n\(r.testWindows),\(r.confusion.tn),\(r.confusion.fp),\(r.confusion.fn),\(r.confusion.tp),\(r.precision),\(r.recall),\(r.f1),true\n")
default:
    print("usage: gonc-sim adversarial [runs] | train")
}
