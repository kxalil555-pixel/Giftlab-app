import Foundation

/// OFFLINE DEMO: server bo'lmaganda ilova ishlashi (craft animatsiyasini tekshirish) uchun xotiradagi soxta server.
actor Demo {
    static let shared = Demo()
    private var gifts: [[String: Any]] = (0..<7).map { i in
        ["id": 100 + i, "k": 14, "no": i + 1, "up": 1, "m": 96 + i % 6, "p": i * 5, "b": i * 7, "n": 0, "s": 0, "h": 0, "d": ""]
    }
    private var nid = 900
    private func js(_ o: Any) -> String { String(data: (try? JSONSerialization.data(withJSONObject: o, options: [.fragmentsAllowed])) ?? Data("null".utf8), encoding: .utf8)! }

    func call(_ name: String, _ input: Any) async -> (String?, String?) {
        switch name {
        case "sub": return (nil, js(["ok": 1, "url": ""]))
        case "me":
            let cols = (0..<15).map { k in ["k": k, "name": k == 14 ? "Resistance Dog" : "Gift \(k)", "open": true, "supply": 1000, "price": 100, "sell": 86, "sold": 50, "issued": 40, "first": 1, "last": 40] as [String: Any] }
            return (nil, js(["admin": 0, "vip": 0, "balance": 1000, "cols": cols, "upgradePrice": 25, "wear": 0, "prem": 0, "status": 0, "plans": [], "statusCount": 0,
                             "photo": "", "minPrice": 70, "starRate": 1, "packs": [], "tgMin": 1, "tgMax": 10, "lite": 0, "gifts": gifts, "total": gifts.count]))
        case "craft":
            let ids = ((input as? [String: Any])?["ids"] as? [Int]) ?? []
            gifts.removeAll { ids.contains($0["id"] as? Int ?? -1) }
            try? await Task.sleep(nanoseconds: 1_200_000_000)
            let win = Int.random(in: 0..<100) < min(88, 22 * ids.count)
            guard win else { return (nil, js(["ok": 0, "chance": 22 * ids.count, "gift": NSNull(), "burned": ids])) }
            nid += 1
            let g: [String: Any] = ["id": nid, "k": 14, "no": nid - 800, "up": 1, "m": 96 + Int.random(in: 0..<10), "p": Int.random(in: 0..<100), "b": Int.random(in: 0..<50), "n": 0, "s": 0, "h": 0, "d": ""]
            gifts.insert(g, at: 0)
            return (nil, js(["ok": 1, "chance": 44, "gift": g, "burned": ids]))
        default: return (nil, js([String: Any]()))
        }
    }
}
