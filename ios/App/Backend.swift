import Foundation

/// Sozlamalar (ios/App/config.json). apiBase bo'sh bo'lsa — ilova OFFLINE DEMO rejimida ishlaydi (Demo.swift ma'lumotlari).
struct Config {
    var apiBase: String
    var token: String
    var userJSON: String
    static func load() -> Config {
        var apiBase = "", token = "", user: [String: Any] = ["id": 1, "first_name": "Guest", "username": "guest"]
        if let p = Bundle.main.path(forResource: "config", ofType: "json"), let d = try? Data(contentsOf: URL(fileURLWithPath: p)),
           let j = try? JSONSerialization.jsonObject(with: d) as? [String: Any] {
            apiBase = (j["apiBase"] as? String) ?? ""; token = (j["token"] as? String) ?? ""
            if let u = j["user"] as? [String: Any] { user = u }
        }
        let uj = (try? JSONSerialization.data(withJSONObject: ["user": user])).flatMap { String(data: $0, encoding: .utf8) } ?? "{\"user\":{}}"
        return Config(apiBase: apiBase, token: token, userJSON: uj)
    }
}

enum Backend {
    static let cfg = Config.load()
    /// (xato JSON, natija JSON) — ikkalasi ham JS ga to'g'ridan-to'g'ri qo'yiladigan matn.
    static func call(_ name: String, _ input: Any) async -> (String?, String?) {
        if cfg.apiBase.isEmpty { return await Demo.shared.call(name, input) }
        guard let url = URL(string: cfg.apiBase.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/" + name),
              let body = try? JSONSerialization.data(withJSONObject: input) else { return ("{\"message\":\"Noto'g'ri manzil\"}", nil) }
        var rq = URLRequest(url: url); rq.httpMethod = "POST"; rq.httpBody = body; rq.timeoutInterval = 25
        rq.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !cfg.token.isEmpty { rq.setValue("Bearer " + cfg.token, forHTTPHeaderField: "Authorization") }
        do {
            let (data, resp) = try await URLSession.shared.data(for: rq)
            let s = String(data: data, encoding: .utf8) ?? "null"
            if let h = resp as? HTTPURLResponse, h.statusCode >= 400 {
                if let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any], j["message"] != nil || j["parameters"] != nil { return (s, nil) }
                return ("{\"message\":\"Server xatosi \(h.statusCode)\"}", nil)
            }
            return (nil, s)
        } catch { return ("{\"message\":\"Internet yo'q\"}", nil) }
    }
}
