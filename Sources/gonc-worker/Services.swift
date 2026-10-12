import Foundation
import Crypto
import Logging
import GoNCCore
import GoNCEngine

/// Calls the Claude Messages API with aggregate counts only. The key stays on the server (ANTHROPIC_API_KEY).
struct AnthropicSummarizer: Summarizer {
    let apiKey: String
    func summarize(_ insights: Insights) async throws -> String {
        var req = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!); req.httpMethod = "POST"; req.timeoutInterval = 30
        req.setValue(apiKey, forHTTPHeaderField: "x-api-key"); req.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version"); req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["model": "claude-sonnet-5-5", "max_tokens": 200, "messages": [["role": "user", "content": SummaryPrompt.text(insights)]]])
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard (resp as? HTTPURLResponse)?.statusCode == 200, let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any], let content = obj["content"] as? [[String: Any]] else { throw WorkerError.badURL("AI service unavailable") }
        return String(content.compactMap { $0["text"] as? String }.joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines).prefix(600))
    }
}

/// Apple Push Notification service over HTTP/2 with a signed JWT. Needs an Apple Developer account and the Push Notifications capability.
struct APNsSender: PushSender {
    let keyID: String, teamID: String, topic: String, privateKeyPEM: String, sandbox: Bool
    private func jwt() throws -> String {
        func b64(_ d: Data) -> String { d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "") }
        let header = b64(try JSONSerialization.data(withJSONObject: ["alg": "ES256", "kid": keyID]))
        let claims = b64(try JSONSerialization.data(withJSONObject: ["iss": teamID, "iat": Int(Date().timeIntervalSince1970)]))
        let signature = try P256.Signing.PrivateKey(pemRepresentation: privateKeyPEM).signature(for: Data("\(header).\(claims)".utf8))
        return "\(header).\(claims).\(b64(signature.rawRepresentation))"
    }
    func send(token: String, title: String, body: String) async throws {
        var req = URLRequest(url: URL(string: "https://\(sandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com")/3/device/\(token)")!); req.httpMethod = "POST"
        req.setValue("bearer \(try jwt())", forHTTPHeaderField: "authorization"); req.setValue(topic, forHTTPHeaderField: "apns-topic"); req.setValue("alert", forHTTPHeaderField: "apns-push-type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["aps": ["alert": ["title": title, "body": body], "sound": "default"]])
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard (resp as? HTTPURLResponse)?.statusCode == 200 else { throw WorkerError.badURL("APNs rejected the push") }
    }
}

/// Used when APNs is not configured: shows what WOULD be sent, without the token.
struct LogPushSender: PushSender {
    let log: Logger
    func send(token: String, title: String, body: String) async throws { log.info("push (not sent, APNs not configured): \(body)") }
}
