import Foundation
import Logging
import NIOSSL
import PostgresNIO

enum WorkerError: Error { case badURL(String) }

/// `postgresql://user:password@host:5432/database` -> a connection pool. TLS is required (Supabase).
func makeClient(url: String) throws -> PostgresClient {
    guard let c = URLComponents(string: url), let host = c.host, let user = c.user else { throw WorkerError.badURL("expected postgresql://user:password@host:port/database") }
    var tls = TLSConfiguration.makeClientConfiguration(); tls.certificateVerification = .fullVerification
    let config = PostgresClient.Configuration(host: host, port: c.port ?? 5432, username: user, password: c.password?.removingPercentEncoding,
                                              database: c.path.isEmpty ? "postgres" : String(c.path.dropFirst()), tls: .require(tls))
    return PostgresClient(configuration: config)
}

extension PostgresClient {
    /// Runs a statement and drains its rows.
    func exec(_ query: PostgresQuery, _ log: Logger) async throws { for try await _ in try await self.query(query, logger: log) {} }
}
