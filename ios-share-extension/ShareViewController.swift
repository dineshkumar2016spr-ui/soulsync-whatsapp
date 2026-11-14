import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    // Must match capacitor.config.ts -> plugins.CapacitorShareTarget.appGroupId
    // and the App Group enabled in Xcode for BOTH the main app and this extension.
    let APP_GROUP_ID = "group.com.soulsync.app"
    // Must match the URL scheme registered for the main app (Info.plist CFBundleURLTypes).
    let APP_URL_SCHEME = "soulsync"

    private var texts: [[String: Any]] = []
    private var files: [[String: Any]] = []

    override public func viewDidLoad() {
        super.viewDidLoad()

        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments, !attachments.isEmpty else {
            self.exit()
            return
        }

        Task {
            for provider in attachments {
                // Text
                if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    if let text = try? await provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String {
                        texts.append(["value": text])
                    }
                    continue
                }
                // Files (WhatsApp exports: .txt / .zip)
                for uti in [UTType.data.identifier, UTType.fileURL.identifier, "public.zip-archive", UTType.zip.identifier] {
                    if provider.hasItemConformingToTypeIdentifier(uti) {
                        if let url = try? await provider.loadItem(forTypeIdentifier: uti) as? URL {
                            let name = url.lastPathComponent
                            let mime = (uti == UTType.zip.identifier || name.lowercased().hasSuffix(".zip"))
                                ? "application/zip" : "text/plain"
                            // Copy into the shared container so the main app can read it.
                            if let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: APP_GROUP_ID) {
                                let dest = container.appendingPathComponent(name)
                                try? FileManager.default.removeItem(at: dest)
                                try? FileManager.default.copyItem(at: url, to: dest)
                                files.append([
                                    "uri": dest.absoluteString,
                                    "name": name,
                                    "mimeType": mime
                                ])
                            }
                        }
                        break
                    }
                }
            }

            let shareData: [String: Any] = [
                "title": extensionItem.attributedTitle?.string ?? "",
                "texts": texts,
                "files": files
            ]

            let userDefaults = UserDefaults(suiteName: APP_GROUP_ID)
            userDefaults?.set(shareData, forKey: "share-target-data")
            userDefaults?.synchronize()

            // Hand control back to the main app.
            if let url = URL(string: "\(APP_URL_SCHEME)://share") {
                self.openURL(url)
            }
            self.exit()
        }
    }

    @objc func exit() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }

    // Open the host app from an extension (allowed for share extensions).
    @objc func openURL(_ url: URL) {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = responder?.next
        }
        // Fallback via selector (works in extensions).
        let selector = sel_registerName("openURL:")
        var current: UIResponder? = self
        while let r = current {
            if r.responds(to: selector) {
                r.perform(selector, with: url)
                return
            }
            current = r.next
        }
    }
}
