import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var timer: Timer?
    var loaded = false

    let defaults: [String: String] = [
        "backendHealthURL": "https://api.zhaoplatforme.com/backend3/health",
        "webURL": "https://zhaoplatforme.com",
        "repo": "PPWAURK/ZHAOSFAMILY",
        "ref": "main",
        "ciWorkflow": "ci.yml",
        "backendWorkflow": "deploy-backend.yml",
        "webWorkflow": "deploy-web.yml",
        "sshHost": "51.178.46.102",
        "sshUser": "ubuntu",
        "sshPort": "22",
        "sshKeyPath": "~/.ssh/zhao_deploy",
        "envPath": "/opt/zhao-family/apps/backend/.env",
        "repoPath": "/Users/shihongwang/Documents/03-Developpement/GitHub/zhao-family",
        "mobileAppPath": "/Users/shihongwang/Documents/03-Developpement/GitHub/zhao-family/apps/mobile",
        "easCommand": "eas",
        "expoToken": ""
    ]
    var config: [String: String] = [:]

    // MARK: - Config persistence

    var configDir: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("ZHAO Monitor", isDirectory: true)
    }
    var configFile: URL { configDir.appendingPathComponent("config.json") }

    func loadConfig() {
        var merged = defaults
        if let data = try? Data(contentsOf: configFile),
           let saved = try? JSONSerialization.jsonObject(with: data) as? [String: String] {
            for (k, v) in saved where !v.isEmpty { merged[k] = v }
        }
        config = merged
    }

    @discardableResult
    func saveConfig(_ incoming: [String: String]) -> Bool {
        var merged = config
        for (k, v) in incoming where defaults[k] != nil && !v.isEmpty { merged[k] = v }
        config = merged
        do {
            try FileManager.default.createDirectory(at: configDir, withIntermediateDirectories: true)
            let data = try JSONSerialization.data(withJSONObject: config, options: [.prettyPrinted, .sortedKeys])
            try data.write(to: configFile)
            return true
        } catch { return false }
    }

    func cfg(_ key: String) -> String { config[key] ?? defaults[key] ?? "" }

    func pushConfigToWeb() {
        if let data = try? JSONSerialization.data(withJSONObject: config),
           let s = String(data: data, encoding: .utf8) {
            webView.evaluateJavaScript("window.applyConfig(\(s))", completionHandler: nil)
        }
    }

    // MARK: - Lifecycle

    func applicationDidFinishLaunching(_ notification: Notification) {
        loadConfig()

        let rect = NSRect(x: 0, y: 0, width: 760, height: 820)
        window = NSWindow(contentRect: rect,
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "部署监测 · ZHAO"
        window.minSize = NSSize(width: 560, height: 560)
        window.center()

        let ucc = WKUserContentController()
        ["refresh", "dispatch", "saveConfig", "resetConfig",
         "listSecrets", "setSecret", "pickKeyFile",
         "readEnv", "saveEnv",
         "gitStatus", "gitCommit", "pipelines",
         "easLocal"].forEach { ucc.add(self, name: $0) }
        let wkcfg = WKWebViewConfiguration()
        wkcfg.userContentController = ucc

        webView = WKWebView(frame: rect, configuration: wkcfg)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.autoresizingMask = [.width, .height]
        window.contentView = webView

        if let url = Bundle.main.url(forResource: "dashboard", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.fetchStatus()
            self?.fetchPipelines()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if !loaded { loaded = true; pushConfigToWeb(); fetchStatus(); fetchPipelines() }
    }

    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.navigationType == .linkActivated,
           let url = navigationAction.request.url,
           url.scheme == "http" || url.scheme == "https" {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView,
                 runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = "ZHAO Monitor"
        alert.informativeText = message
        alert.alertStyle = .warning
        alert.addButton(withTitle: "确认")
        alert.addButton(withTitle: "取消")
        completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "refresh":
            fetchStatus()
            fetchPipelines()
        case "pipelines":
            fetchPipelines()
        case "dispatch":
            runDispatch((message.body as? String) ?? "")
        case "easLocal":
            runLocalEAS((message.body as? String) ?? "")
        case "saveConfig":
            if let s = message.body as? String,
               let d = s.data(using: .utf8),
               let obj = try? JSONSerialization.jsonObject(with: d) as? [String: String] {
                saveConfig(obj)
            }
            pushConfigSavedToWeb()
        case "resetConfig":
            try? FileManager.default.removeItem(at: configFile)
            config = defaults
            pushConfigSavedToWeb()
        case "listSecrets":
            listSecrets()
        case "setSecret":
            if let s = message.body as? String, let d = s.data(using: .utf8),
               let o = try? JSONSerialization.jsonObject(with: d) as? [String: String],
               let name = o["name"], let value = o["value"] {
                applySecret(name: name, value: value)
            }
        case "pickKeyFile":
            pickKeyFile((message.body as? String) ?? "")
        case "readEnv":
            readEnv()
        case "saveEnv":
            saveEnv((message.body as? String) ?? "")
        case "gitStatus":
            gitStatus()
        case "gitCommit":
            if let s = message.body as? String, let d = s.data(using: .utf8),
               let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
               let msg = o["message"] as? String {
                gitCommit(message: msg, push: (o["push"] as? Bool) ?? false)
            }
        default:
            break
        }
    }

    func pushConfigSavedToWeb() {
        if let data = try? JSONSerialization.data(withJSONObject: config),
           let s = String(data: data, encoding: .utf8) {
            webView.evaluateJavaScript("window.configSaved(\(s))", completionHandler: nil)
        }
    }

    // MARK: - Trigger CI / CD via gh

    func runDispatch(_ key: String) {
        let workflows: [String]
        switch key {
        case "ci":
            workflows = [cfg("ciWorkflow")]
        case "backend":
            workflows = [cfg("backendWorkflow")]
        case "web":
            workflows = [cfg("webWorkflow")]
        case "all":
            workflows = [cfg("ciWorkflow"), cfg("backendWorkflow"), cfg("webWorkflow")]
        default: return
        }
        let repo = cfg("repo"), ref = cfg("ref")
        DispatchQueue.global().async {
            var ok = true
            var detail = "已提交，查看 Actions"
            for workflow in workflows {
                let (code, out) = self.runGH(file: workflow, repo: repo, ref: ref)
                if code != 0 {
                    ok = false
                    detail = out.trimmingCharacters(in: .whitespacesAndNewlines)
                        .replacingOccurrences(of: "\n", with: " ")
                    break
                }
            }
            if detail.count > 140 { detail = String(detail.prefix(140)) + "…" }
            DispatchQueue.main.async {
                self.webView.evaluateJavaScript(
                    "window.dispatchResult('\(key)', \(ok), \(self.jsString(detail)))",
                    completionHandler: nil)
                for d in [4.0, 12.0, 25.0] {
                    DispatchQueue.main.asyncAfter(deadline: .now() + d) { self.fetchPipelines() }
                }
            }
        }
    }

    // MARK: - Local EAS commands

    func runLocalEAS(_ key: String) {
        let action: (platform: String, operation: String)?
        switch key {
        case "mobileAndroidBuild": action = ("android", "build")
        case "mobileAndroidSubmit": action = ("android", "submit")
        case "mobileIosBuild": action = ("ios", "build")
        case "mobileIosSubmit": action = ("ios", "submit")
        default: action = nil
        }
        guard let action else { return }

        let command = buildEASCommand(platform: action.platform, operation: action.operation)
        DispatchQueue.global().async {
            let (code, out) = self.runShell(command)
            let detail = out.trimmingCharacters(in: .whitespacesAndNewlines)
                .replacingOccurrences(of: "\n", with: " ")
            DispatchQueue.main.async {
                self.webView.evaluateJavaScript(
                    "window.easLocalDone('\(key)', \(code == 0), \(self.jsString(String(detail.suffix(180)))))",
                    completionHandler: nil)
                self.fetchPipelines()
            }
        }
    }

    func buildEASCommand(platform: String, operation: String) -> String {
        let appPath = cfg("mobileAppPath")
        let eas = cfg("easCommand").isEmpty ? "eas" : cfg("easCommand")
        let token = cfg("expoToken")
        let env = token.isEmpty ? "" : "EXPO_TOKEN=\(sh(token)) "
        let easArgs: String
        if operation == "build" {
            easArgs = "build --platform \(sh(platform)) --profile production --non-interactive --no-wait"
        } else {
            easArgs = "submit --platform \(sh(platform)) --profile production --non-interactive"
        }
        return "cd \(sh(appPath)) && \(env)\(sh(eas)) \(easArgs) 2>&1"
    }

    func runShell(_ command: String) -> (Int32, String) {
        let task = Process()
        task.launchPath = "/bin/zsh"
        task.arguments = ["-lc", command]
        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = pipe
        do { try task.run() } catch {
            return (127, "无法启动命令：\(error.localizedDescription)")
        }
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        task.waitUntilExit()
        return (task.terminationStatus, String(data: data, encoding: .utf8) ?? "")
    }

    // MARK: - Pipeline runs

    func fetchPipelines() {
        guard loaded else { return }
        let repo = cfg("repo")
        DispatchQueue.global().async {
            let task = Process()
            task.launchPath = "/bin/zsh"
            task.arguments = ["-lc",
                "gh run list --repo \(self.sh(repo)) --limit 20 --json workflowName,status,conclusion,headBranch,event,createdAt,url 2>&1"]
            let pipe = Pipe(); task.standardOutput = pipe; task.standardError = pipe
            do { try task.run() } catch { return }
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            task.waitUntilExit()
            guard task.terminationStatus == 0,
                  let s = String(data: data, encoding: .utf8),
                  (try? JSONSerialization.jsonObject(with: data)) != nil else { return }
            DispatchQueue.main.async {
                self.webView.evaluateJavaScript("window.renderPipelines(\(s))", completionHandler: nil)
            }
        }
    }

    func runGH(file: String, repo: String, ref: String) -> (Int32, String) {
        let task = Process()
        task.launchPath = "/bin/zsh"
        task.arguments = ["-lc",
            "gh workflow run \(sh(file)) --ref \(sh(ref)) --repo \(sh(repo)) 2>&1"]
        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = pipe
        do { try task.run() } catch {
            return (127, "无法启动 gh：\(error.localizedDescription)")
        }
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        task.waitUntilExit()
        return (task.terminationStatus, String(data: data, encoding: .utf8) ?? "")
    }

    // Single-quote a shell argument safely.
    func sh(_ s: String) -> String { "'" + s.replacingOccurrences(of: "'", with: "'\\''") + "'" }

    func jsString(_ s: String) -> String {
        if let d = try? JSONSerialization.data(withJSONObject: [s]),
           let j = String(data: d, encoding: .utf8) {
            return String(j.dropFirst().dropLast())
        }
        return "\"\""
    }

    // MARK: - GitHub secrets (gh secret list / set)

    func listSecrets() {
        let repo = cfg("repo")
        DispatchQueue.global().async {
            let task = Process()
            task.launchPath = "/bin/zsh"
            task.arguments = ["-lc", "gh secret list --repo \(self.sh(repo)) --json name,updatedAt 2>&1"]
            let pipe = Pipe(); task.standardOutput = pipe; task.standardError = pipe
            do { try task.run() } catch {
                DispatchQueue.main.async {
                    self.webView.evaluateJavaScript("showToast('无法启动 gh','bad')", completionHandler: nil)
                }
                return
            }
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            task.waitUntilExit()
            let str = String(data: data, encoding: .utf8) ?? "[]"
            DispatchQueue.main.async {
                if task.terminationStatus == 0, (try? JSONSerialization.jsonObject(with: data)) != nil {
                    self.webView.evaluateJavaScript("window.renderSecrets(\(str))", completionHandler: nil)
                } else {
                    let m = str.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "\n", with: " ")
                    self.webView.evaluateJavaScript("showToast(\(self.jsString("读取 secrets 失败: " + String(m.prefix(120)))),'bad')", completionHandler: nil)
                }
            }
        }
    }

    func applySecret(name: String, value: String) {
        DispatchQueue.global().async {
            let (code, out) = self.setSecretCmd(name: name, value: value)
            DispatchQueue.main.async { self.reportSecret(name, code == 0, out) }
        }
    }

    func setSecretCmd(name: String, value: String) -> (Int32, String) {
        let task = Process()
        task.launchPath = "/bin/zsh"
        task.arguments = ["-lc", "gh secret set \(sh(name)) --repo \(sh(cfg("repo"))) --body-file - 2>&1"]
        let inPipe = Pipe(); let outPipe = Pipe()
        task.standardInput = inPipe; task.standardOutput = outPipe; task.standardError = outPipe
        do { try task.run() } catch { return (127, "无法启动 gh") }
        if let d = value.data(using: .utf8) { inPipe.fileHandleForWriting.write(d) }
        inPipe.fileHandleForWriting.closeFile()
        let out = outPipe.fileHandleForReading.readDataToEndOfFile()
        task.waitUntilExit()
        return (task.terminationStatus, String(data: out, encoding: .utf8) ?? "")
    }

    func reportSecret(_ name: String, _ ok: Bool, _ raw: String) {
        let m = raw.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "\n", with: " ")
        webView.evaluateJavaScript("window.secretSet('\(name)', \(ok), \(jsString(String(m.prefix(140)))))", completionHandler: nil)
    }

    func pickKeyFile(_ name: String) {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.message = "选择 \(name) 的私钥 / 凭证文件"
        panel.begin { resp in
            guard resp == .OK, let url = panel.url,
                  let contents = try? String(contentsOf: url, encoding: .utf8) else {
                self.reportSecret(name, false, "已取消或读取失败")
                return
            }
            self.applySecret(name: name, value: contents)
        }
    }

    // MARK: - Server .env over SSH

    func sshRun(_ remoteCmd: String, stdin: String? = nil) -> (Int32, String) {
        let key = (cfg("sshKeyPath") as NSString).expandingTildeInPath
        let task = Process()
        task.launchPath = "/usr/bin/ssh"
        task.arguments = ["-i", key, "-p", cfg("sshPort"),
                          "-o", "StrictHostKeyChecking=accept-new",
                          "-o", "ConnectTimeout=10", "-o", "BatchMode=yes",
                          "\(cfg("sshUser"))@\(cfg("sshHost"))", remoteCmd]
        let outPipe = Pipe(); task.standardOutput = outPipe; task.standardError = outPipe
        var inPipe: Pipe?
        if stdin != nil { inPipe = Pipe(); task.standardInput = inPipe }
        do { try task.run() } catch { return (127, "无法启动 ssh：\(error.localizedDescription)") }
        if let s = stdin, let ip = inPipe {
            ip.fileHandleForWriting.write(s.data(using: .utf8) ?? Data())
            ip.fileHandleForWriting.closeFile()
        }
        let d = outPipe.fileHandleForReading.readDataToEndOfFile()
        task.waitUntilExit()
        return (task.terminationStatus, String(data: d, encoding: .utf8) ?? "")
    }

    func readEnv() {
        let env = sh(cfg("envPath"))
        DispatchQueue.global().async {
            let (code, out) = self.sshRun("cat \(env)")
            DispatchQueue.main.async {
                if code == 0 {
                    self.webView.evaluateJavaScript("window.renderEnv(\(self.jsString(out)))", completionHandler: nil)
                } else {
                    let m = out.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "\n", with: " ")
                    self.webView.evaluateJavaScript("window.renderEnv(\(self.jsString("# 读取失败: " + m)))", completionHandler: nil)
                }
            }
        }
    }

    func saveEnv(_ content: String) {
        let env = sh(cfg("envPath"))
        let cmd = "cp \(env) \(env).bak 2>/dev/null; cat > \(env)"
        DispatchQueue.global().async {
            let (code, out) = self.sshRun(cmd, stdin: content)
            DispatchQueue.main.async {
                let ok = code == 0
                let m = out.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "\n", with: " ")
                self.webView.evaluateJavaScript("window.envSaved(\(ok), \(self.jsString(String(m.prefix(140)))))", completionHandler: nil)
            }
        }
    }

    // MARK: - Local git (status / commit / push)

    func git(_ args: [String]) -> (Int32, String) {
        let task = Process()
        task.launchPath = "/usr/bin/git"
        task.arguments = ["-C", (cfg("repoPath") as NSString).expandingTildeInPath] + args
        let pipe = Pipe(); task.standardOutput = pipe; task.standardError = pipe
        do { try task.run() } catch { return (127, "无法启动 git") }
        let d = pipe.fileHandleForReading.readDataToEndOfFile()
        task.waitUntilExit()
        return (task.terminationStatus, String(data: d, encoding: .utf8) ?? "")
    }

    func gitStatus() {
        DispatchQueue.global().async {
            let (code, out) = self.git(["status", "--porcelain=v1", "--branch"])
            let text = code == 0 ? out : "# git 错误: " + out
            DispatchQueue.main.async {
                self.webView.evaluateJavaScript("window.renderGit(\(self.jsString(text)))", completionHandler: nil)
            }
        }
    }

    func gitCommit(message: String, push: Bool) {
        DispatchQueue.global().async {
            var log = ""; var ok = true
            let (c1, o1) = self.git(["add", "-A"]); log += o1
            if c1 != 0 { ok = false }
            if ok {
                let (c2, o2) = self.git(["commit", "-m", message]); log += o2
                if c2 != 0 { ok = false }
            }
            if ok && push {
                let (c3, o3) = self.git(["push"]); log += " | " + o3
                if c3 != 0 { ok = false }
            }
            let summary = log.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "\n", with: " ")
            DispatchQueue.main.async {
                self.webView.evaluateJavaScript("window.gitDone(\(ok), \(self.jsString(String(summary.suffix(170)))))", completionHandler: nil)
            }
        }
    }

    // MARK: - Live status

    func fetchStatus() {
        guard loaded else { return }
        let group = DispatchGroup()
        var backend = "down"; var backendDb = ""; var backendMs = 0
        var web = "down"; var webMs = 0; var webCode = 0

        if let u = URL(string: cfg("backendHealthURL")) {
            group.enter()
            let t0 = Date()
            var r = URLRequest(url: u); r.timeoutInterval = 10
            URLSession.shared.dataTask(with: r) { data, resp, _ in
                backendMs = Int(Date().timeIntervalSince(t0) * 1000)
                if let http = resp as? HTTPURLResponse, http.statusCode == 200 {
                    backend = "up"
                    if let d = data,
                       let obj = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
                       let db = obj["database"] as? String { backendDb = db }
                }
                group.leave()
            }.resume()
        }

        if let u = URL(string: cfg("webURL")) {
            group.enter()
            let t1 = Date()
            var r = URLRequest(url: u); r.timeoutInterval = 10
            URLSession.shared.dataTask(with: r) { _, resp, _ in
                webMs = Int(Date().timeIntervalSince(t1) * 1000)
                if let http = resp as? HTTPURLResponse {
                    webCode = http.statusCode
                    if http.statusCode == 200 { web = "up" }
                }
                group.leave()
            }.resume()
        }

        group.notify(queue: .main) {
            let fmt = DateFormatter(); fmt.dateFormat = "HH:mm:ss"
            let payload: [String: Any] = [
                "backend": backend, "backendMs": backendMs, "backendDb": backendDb,
                "web": web, "webMs": webMs, "webCode": webCode,
                "time": fmt.string(from: Date())
            ]
            if let json = try? JSONSerialization.data(withJSONObject: payload),
               let s = String(data: json, encoding: .utf8) {
                self.webView.evaluateJavaScript("window.updateStatus(\(s))", completionHandler: nil)
            }
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
