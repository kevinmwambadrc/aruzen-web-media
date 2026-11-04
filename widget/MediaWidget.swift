// Aruzen Web Media : widget de barre de menus.
// Colle (ou copie) un lien depuis n'importe quel navigateur, DuckDuckGo compris, et lance le téléchargement.
// Il partage la file d'attente des extensions via host/media_helper.py.
import AppKit
import SwiftUI

let helper = NSString(string: "~/Library/Application Support/AruzenWebMedia/media_helper.py").expandingTildeInPath

struct Job: Decodable, Identifiable {
    let id: String
    let kind: String
    let title: String
    let status: String
    let percent: Double?
    let speed: String?
    let eta: String?
    let error: String?
    var active: Bool { ["queued", "starting", "running"].contains(status) }
}

struct Reply: Decodable {
    let ok: Bool
    let jobs: [Job]?
    let error: String?
}

@discardableResult
func runHelper(_ args: [String]) -> Data {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
    p.arguments = [helper] + args
    let out = Pipe()
    p.standardOutput = out
    p.standardError = FileHandle.nullDevice
    try? p.run()
    let data = out.fileHandleForReading.readDataToEndOfFile()
    p.waitUntilExit()
    return data
}

final class Model: ObservableObject {
    @Published var url = ""
    @Published var kind = "video"
    @Published var quality = "best"
    @Published var jobs: [Job] = []
    @Published var message = ""
    @Published var watchClipboard = UserDefaults.standard.object(forKey: "watch") as? Bool ?? true {
        didSet { UserDefaults.standard.set(watchClipboard, forKey: "watch") }
    }
    @Published var hasNewLink = false
    private var lastChange = NSPasteboard.general.changeCount
    private var refreshTimer: Timer?

    init() {
        // Lecture du presse-papiers : une comparaison d'entier toutes les 1,5 s, quasi gratuite.
        Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in self?.checkClipboard() }
    }

    func checkClipboard() {
        let pb = NSPasteboard.general
        guard watchClipboard, pb.changeCount != lastChange else { return }
        lastChange = pb.changeCount
        if let s = pb.string(forType: .string)?.trimmingCharacters(in: .whitespacesAndNewlines),
           s.hasPrefix("http"), !s.contains(" ") {
            url = s
            hasNewLink = true
        }
    }

    func paste() {
        if let s = NSPasteboard.general.string(forType: .string) { url = s.trimmingCharacters(in: .whitespacesAndNewlines) }
    }

    func download() {
        let req: [String: Any] = ["url": url, "kind": kind, "quality": quality]
        guard let data = try? JSONSerialization.data(withJSONObject: req), let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.global().async {
            let r = try? JSONDecoder().decode(Reply.self, from: runHelper(["--enqueue", json]))
            DispatchQueue.main.async {
                self.message = r?.ok == true ? "Ajouté ✓" : (r?.error ?? "Échec")
                if r?.ok == true { self.url = ""; self.hasNewLink = false }
                self.refresh()
            }
        }
    }

    // Rafraîchi seulement quand la fenêtre est ouverte : rien ne tourne en arrière-plan sinon.
    func startRefreshing() {
        refresh()
        hasNewLink = false
        refreshTimer?.invalidate()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in self?.refresh() }
    }

    func stopRefreshing() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    func refresh() {
        DispatchQueue.global().async {
            let r = try? JSONDecoder().decode(Reply.self, from: runHelper(["--jobs"]))
            DispatchQueue.main.async { self.jobs = Array((r?.jobs ?? []).prefix(8)) }
        }
    }

    func cancel(_ id: String) { DispatchQueue.global().async { runHelper(["--cancel", id]); self.refresh() } }
    func reveal(_ id: String) { DispatchQueue.global().async { runHelper(["--reveal", id]) } }
    func openFolder() { DispatchQueue.global().async { runHelper(["--open"]) } }
    func clear() { DispatchQueue.global().async { runHelper(["--clear"]); self.refresh() } }
}

struct JobRow: View {
    let job: Job
    let model: Model
    var icon: String {
        ["video": "film", "audio": "music.note", "playlist": "list.and.film", "subs": "captions.bubble",
         "thumb": "photo", "file": "shippingbox"][job.kind] ?? "arrow.down"
    }
    var detail: String {
        switch job.status {
        case "running": return [String(format: "%.0f %%", job.percent ?? 0), job.speed ?? "", job.eta.map { $0.isEmpty ? "" : "reste \($0)" } ?? ""]
            .filter { !$0.isEmpty }.joined(separator: " · ")
        case "queued", "starting": return "En attente"
        case "done": return "Terminé"
        case "cancelled": return "Annulé"
        default: return job.error ?? "Erreur"
        }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Image(systemName: icon).foregroundStyle(.secondary).frame(width: 16)
                Text(job.title).lineLimit(1).truncationMode(.middle)
                Spacer()
                if job.active {
                    Button { model.cancel(job.id) } label: { Image(systemName: "xmark.circle.fill") }.buttonStyle(.plain).foregroundStyle(.secondary)
                } else if job.status == "done" {
                    Button { model.reveal(job.id) } label: { Image(systemName: "magnifyingglass.circle.fill") }.buttonStyle(.plain).foregroundStyle(.secondary)
                }
            }
            if job.active { ProgressView(value: (job.percent ?? 0) / 100).tint(.orange) }
            Text(detail).font(.caption).foregroundStyle(job.status == "error" ? .red : .secondary).lineLimit(1)
        }
        .padding(8)
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.primary.opacity(0.05)))
    }
}

struct Panel: View {
    @ObservedObject var model: Model
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Aruzen Web Media").font(.headline)
                Spacer()
                Button("Dossier") { model.openFolder() }
            }
            HStack {
                TextField("Lien vidéo, musique, playlist…", text: $model.url)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { model.download() }
                Button { model.paste() } label: { Image(systemName: "doc.on.clipboard") }.help("Coller")
            }
            Picker("", selection: $model.kind) {
                Text("Vidéo").tag("video")
                Text("MP3").tag("audio")
                Text("Playlist").tag("playlist")
                Text("Sous-titres").tag("subs")
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            HStack {
                if model.kind == "video" || model.kind == "playlist" {
                    Picker("Qualité", selection: $model.quality) {
                        Text("Meilleure").tag("best")
                        Text("1080p").tag("1080")
                        Text("720p").tag("720")
                        Text("480p").tag("480")
                    }
                    .frame(width: 170)
                }
                Spacer()
                Button("Télécharger") { model.download() }
                    .keyboardShortcut(.defaultAction)
                    .disabled(!model.url.hasPrefix("http"))
            }
            if !model.message.isEmpty { Text(model.message).font(.caption).foregroundStyle(.secondary) }
            Divider()
            HStack {
                Text("Téléchargements").font(.subheadline.weight(.semibold))
                Spacer()
                Button("Effacer les terminés") { model.clear() }.buttonStyle(.link).font(.caption)
            }
            if model.jobs.isEmpty {
                Text("Aucun téléchargement").font(.caption).foregroundStyle(.secondary)
            } else {
                ScrollView { VStack(spacing: 6) { ForEach(model.jobs) { JobRow(job: $0, model: model) } } }
                    .frame(maxHeight: 300)
            }
            Divider()
            HStack {
                Toggle("Détecter les liens copiés", isOn: $model.watchClipboard).toggleStyle(.checkbox).font(.caption)
                Spacer()
                Button("Quitter") { NSApp.terminate(nil) }.buttonStyle(.link).font(.caption)
            }
        }
        .padding(14)
        .frame(width: 380)
        .onAppear { model.startRefreshing() }
        .onDisappear { model.stopRefreshing() }
    }
}

@main
struct MediaWidgetApp: App {
    @StateObject private var model = Model()
    var body: some Scene {
        MenuBarExtra {
            Panel(model: model)
        } label: {
            Image(systemName: model.hasNewLink ? "arrow.down.circle.fill" : "arrow.down.circle")
        }
        .menuBarExtraStyle(.window)
    }
}
