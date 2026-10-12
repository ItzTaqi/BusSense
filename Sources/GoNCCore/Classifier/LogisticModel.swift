import Foundation

/// Bus-vs-car classifier: logistic regression with a standard scaler. z = sum w_i * (x_i - mean_i) / scale_i + bias; P = sigmoid(z).
/// Runs on the phone; location is uploaded only while P(bus) >= 0.7. Fails closed.
public struct LogisticModel: Equatable, Codable, Sendable {
    public var features: [String]
    public var mean: [Double]
    public var scale: [Double]
    public var weights: [Double]
    public var bias: Double
    public var syntheticPlaceholder: Bool

    public init(features: [String], mean: [Double], scale: [Double], weights: [Double], bias: Double, syntheticPlaceholder: Bool = false) {
        self.features = features; self.mean = mean; self.scale = scale; self.weights = weights; self.bias = bias; self.syntheticPlaceholder = syntheticPlaceholder
    }
    enum CodingKeys: String, CodingKey { case features, mean, scale, weights, bias, syntheticPlaceholder = "synthetic_placeholder" }

    public static let uploadThreshold = 0.7

    /// P(bus). Numerically stable sigmoid.
    public func probability(_ x: [Double]) -> Double {
        var z = bias
        for i in 0..<weights.count { z += weights[i] * (x[i] - mean[i]) / scale[i] }
        return z >= 0 ? 1 / (1 + exp(-z)) : exp(z) / (1 + exp(z))
    }
    /// Fail closed: if the input is malformed, do NOT upload.
    public func shouldUpload(_ x: [Double]) -> Bool {
        guard x.count == weights.count, x.allSatisfy(\.isFinite) else { return false }
        return probability(x) >= Self.uploadThreshold
    }
}
