import { Notice, Platform, Plugin, Editor, MarkdownView } from 'obsidian'
import { QuireAuthModal } from './modals'
import { DEFAULT_SETTINGS, OQSyncSettingTab, OQSyncSettings } from './settings'
import { syncTask, toggleServerTaskStatus } from './taskmanager'

export const PLUGIN_NAME = 'Obsidian Quire Sync'

export default class OQSync extends Plugin {
  settings: OQSyncSettings

  async onload() {
    await this.loadSettings()

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon(
      'sync',
      'OQSync',
      (evt: MouseEvent) => {
        // Called when the user clicks the icon.
        new Notice('Synced with Quire!')
      }
    )
    // Perform additional things with the ribbon
    ribbonIconEl.addClass('oqsync-ribbon-class')
		this.addCommand({
      id: 'toggle-quire-task',
      name: 'Toggle Quire task',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        if (this.settings.tokenData === undefined) {
          return
        }
        toggleServerTaskStatus(editor, this.settings.tokenData.access_token)
        // @ts-ignore undocumented but was recommended to use here - https://github.com/obsidianmd/obsidian-releases/pull/768#issuecomment-1038441881
        view.app.commands.executeCommandById('editor:toggle-checklist-status')
      },
    })
    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'auth-with-quire',
      name: 'Authenticate with Quire',
      checkCallback: (checking: boolean) => {
        // We can only support authorizing on desktop because of node requirement
        // However, the token is saved in the vault so syncing is still supported
        // This is why the plugin isn't marked as isDesktopOnly
        if (Platform.isDesktop) {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.
          if (!checking) {
            new QuireAuthModal(this.app, this.settings, this.saveData.bind(this)).open()
          }
          // This command will only show up in Command Palette when the check function returns true
          return true
        }
        return false
      },
    })
    // This adds a complex command that can check whether the current state of the app allows execution of the command
    this.addCommand({
      id: 'sync-with-quire',
      name: 'Sync with Quire',
      checkCallback: (checking: boolean) => {
        // Conditions to check
        const hasAuthToken = this.settings.tokenData?.access_token != null
        if (hasAuthToken) {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.
          if (!checking) {
            new QuireSyncModal(this.app).open()
          }

          // This command will only show up in Command Palette when the check function returns true
          return true
        }
      },
    })

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new OQSyncSettingTab(this.app, this))
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }
}
