import { App, Modal } from 'obsidian'
import { startServer } from 'src/lib/server'
import * as http from 'http'
import { OQSyncSettings } from 'src/settings'
export class QuireSyncModal extends Modal {
  constructor(app: App) {
    super(app)
  }

  onOpen() {
    const { contentEl } = this
    contentEl.setText('Woah!')
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}

export class QuireAuthModal extends Modal {
  server: http.Server
  settings: OQSyncSettings
  saveSettings: CallableFunction

  constructor(app: App, settings: OQSyncSettings, saveSettings: CallableFunction) {
    super(app)
    this.settings = settings
    this.saveSettings = saveSettings
  }

  onOpen() {
    const { contentEl } = this
    contentEl.setText('Please complete authentication in your browser (leave this modal open until complete)')
    const host = 'localhost'
    const port = 8080

    this.server = startServer(host, port, this.settings, this.saveSettings)
    window.open(
      `https://quire.io/oauth?client_id=${this.settings.clientId}&redirect_uri=http://${host}:${port}/`
    )
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}
