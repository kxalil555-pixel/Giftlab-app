import UIKit
import WebKit

/// miniapp/ papkasini ilova ichidan "app://local/" sxemasi bilan beradi (fetch, ES-modullar, modellar ishlashi uchun).
final class AppSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root = Bundle.main.resourceURL!.appendingPathComponent("miniapp")
    private func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "svg": return "image/svg+xml"
        case "webp": return "image/webp"
        default: return "application/octet-stream"
        }
    }
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst()))
        guard var data = try? Data(contentsOf: file) else {
            let r = HTTPURLResponse(url: url, statusCode: 404, httpVersion: nil, headerFields: nil)!
            task.didReceive(r); task.didFinish(); return
        }
        // Telegramning tashqi skripti o'rniga bizning qatlam ishlaydi
        if path == "/index.html", var s = String(data: data, encoding: .utf8) {
            s = s.replacingOccurrences(of: "<script src=\"https://telegram.org/js/telegram-web-app.js\"></script>", with: "")
            data = s.data(using: .utf8)!
        }
        let r = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                headerFields: ["Content-Type": mime(file.pathExtension), "Content-Length": "\(data.count)", "Cache-Control": "no-cache"])!
        task.didReceive(r); task.didReceive(data); task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class WebViewController: UIViewController, WKScriptMessageHandler, WKUIDelegate {
    private var web: WKWebView!

    override var preferredStatusBarStyle: UIStatusBarStyle { .default }
    override var prefersHomeIndicatorAutoHidden: Bool { false }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        let cfg = WKWebViewConfiguration()
        cfg.setURLSchemeHandler(AppSchemeHandler(), forURLScheme: "app")
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        let uc = WKUserContentController()
        uc.add(self, name: "native")
        let conf = Config.load()
        let boot = "window.__GIFTS_CFG = \(conf.userJSON);"
        uc.addUserScript(WKUserScript(source: boot, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        if let p = Bundle.main.path(forResource: "telegram-shim", ofType: "js"), let src = try? String(contentsOfFile: p) {
            uc.addUserScript(WKUserScript(source: src, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        cfg.userContentController = uc
        web = WKWebView(frame: .zero, configuration: cfg)
        web.translatesAutoresizingMaskIntoConstraints = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.backgroundColor = .clear
        web.uiDelegate = self
        if #available(iOS 16.4, *) { web.isInspectable = true }
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.topAnchor), web.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor), web.trailingAnchor.constraint(equalTo: view.trailingAnchor)])
        web.load(URLRequest(url: URL(string: "app://local/index.html")!))
    }

    // MARK: JS -> native
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        guard let d = m.body as? [String: Any], let t = d["t"] as? String else { return }
        switch t {
        case "haptic": haptic(d["k"] as? String ?? "light")
        case "open": if let s = d["u"] as? String, let u = URL(string: s) { UIApplication.shared.open(u) }
        case "confirm":
            let id = d["id"] as? Int ?? 0, msg = d["m"] as? String ?? "", alertOnly = d["alert"] != nil
            let a = UIAlertController(title: nil, message: msg, preferredStyle: .alert)
            if !alertOnly { a.addAction(UIAlertAction(title: "Bekor", style: .cancel) { _ in self.reply(id, nil, "false") }) }
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in self.reply(id, nil, "true") })
            present(a, animated: true)
        case "popup":
            let id = d["id"] as? Int ?? 0, p = d["p"] as? [String: Any] ?? [:]
            let a = UIAlertController(title: p["title"] as? String, message: p["message"] as? String, preferredStyle: .alert)
            let bs = p["buttons"] as? [[String: Any]] ?? [["id": "ok", "type": "ok"]]
            for b in bs {
                let bid = b["id"] as? String ?? "", ty = b["type"] as? String ?? "default"
                let title = b["text"] as? String ?? (ty == "cancel" ? "Bekor" : "OK")
                a.addAction(UIAlertAction(title: title, style: ty == "cancel" ? .cancel : ty == "destructive" ? .destructive : .default) { _ in self.reply(id, nil, "\"\(bid)\"") })
            }
            present(a, animated: true)
        case "call":
            let id = d["id"] as? Int ?? 0, name = d["name"] as? String ?? "", input: Any = d["input"] ?? [String: Any]()
            Task { let (e, r) = await Backend.call(name, input); self.reply(id, e, r) }
        default: break
        }
    }
    private func reply(_ id: Int, _ err: String?, _ res: String?) {
        let e = err ?? "null", r = res ?? "null"
        web.evaluateJavaScript("window.__nativeReply(\(id), \(e), \(r))", completionHandler: nil)
    }
    private func haptic(_ k: String) {
        switch k {
        case "n_success": UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "n_error": UINotificationFeedbackGenerator().notificationOccurred(.error)
        case "n_warning": UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case "select": UISelectionFeedbackGenerator().selectionChanged()
        case "heavy": UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case "medium": UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "rigid": UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        case "soft": UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        default: UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
    // target=_blank havolalar
    func webView(_ w: WKWebView, createWebViewWith c: WKWebViewConfiguration, for a: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let u = a.request.url { UIApplication.shared.open(u) }
        return nil
    }
}
