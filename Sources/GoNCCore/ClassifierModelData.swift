// SYNTHETIC PLACEHOLDER: trained on simulated windows only. Its accuracy says nothing about real rides.
// Retrain with `gonc-sim train` on real labeled recordings, then paste the printed model here.
public extension LogisticModel {
    static let shipped = LogisticModel(
        features: ["stops_per_km", "max_speed", "mean_accel_out_of_stops", "frac_stationary", "heading_change_rate_low_speed", "accel_vertical_variance"],
        mean: [1.282824142857143, 8.494603857142854, 0.4063129047619045, 0.14497385714285713, 4.871137547619051, 0.8960373571428567],
        scale: [1.5129265878622313, 4.946997189304252, 0.3922464229472284, 0.14531351013905086, 2.0790939123440597, 0.603308786260376],
        weights: [3.1894372335274572, -0.2897522768867633, 0.1755997778473523, 2.5230690492749055, -0.10198390207525938, 0.6793109525768948],
        bias: -1.301156658251373,
        syntheticPlaceholder: true
    )
}
