import { App, PluginSettingTab, Setting } from 'obsidian'
import OQSync from './main'

export interface TokenData {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
}

export interface OQSyncSettings {
  tokenData?: TokenData
  clientId: string
  clientSecret: string
}

export const DEFAULT_SETTINGS: OQSyncSettings = {
  clientId: '',
  clientSecret: '',
}

export class OQSyncSettingTab extends PluginSettingTab {
  plugin: OQSync

  constructor(app: App, plugin: OQSync) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()

    new Setting(containerEl)
      .setHeading()
      .setName('Quire API Settings')
      .setDesc('Create these at https://quire.io/apps/dev')
      .addButton((cb) =>
        cb
          .setButtonText('Register app with Quire')
          .onClick(() => window.open('https://quire.io/apps/dev'))
      )

    new Setting(containerEl)
      .setName('Client ID')
      .setDesc('Client ID from Quire App (can be Development credentials)')
      .addText((text) =>
        text
          .setPlaceholder('Enter your client id')
          .setValue(this.plugin.settings.clientId)
          .onChange(async (value) => {
            this.plugin.settings.clientId = value
            await this.plugin.saveSettings()
          })
      )
    new Setting(containerEl)
      .setName('Client Secret')
      .setDesc('Client Secret from Quire App (can be Development credentials)')
      .addText((text) =>
        text
          .setPlaceholder('Enter your client secret')
          .setValue(this.plugin.settings.clientSecret)
          .onChange(async (value) => {
            this.plugin.settings.clientSecret = value
            await this.plugin.saveSettings()
          })
      )
  }
}
