import { Notice, Platform, Plugin, Editor, MarkdownView } from 'obsidian'
import { QuireAuthModal } from './modals'
import { DEFAULT_SETTINGS, OQSyncSettingTab, OQSyncSettings } from './settings'
import { pushTask, toggleServerTaskStatus } from './taskmanager'

export const PLUGIN_NAME = 'Obsidian Quire Sync'

export default class OQSync extends Plugin {
  settings: OQSyncSettings

  async syncWithQuire(e: Editor) {
    const item = this.addStatusBarItem()
    item.createEl('span', { text: 'Syncing with Quire...' })
    if (this.settings.tokenData === undefined) {
				new Notice(PLUGIN_NAME + ": Please authenticate using a desktop version of Obsidian");
				throw PLUGIN_NAME + ': missing access token.'
    }
    if (e === null) {
      new Notice(
        'Obsidian Quire Sync: Please open a file before attempting to sync with Quire'
      )
      return
    }
    await pushTask(e, this.settings)
    item.remove()
    new Notice('Synced with Quire!')
  }

  async onload() {
    await this.loadSettings()

		this.addCommand({
      id: 'toggle-quire-task',
      name: 'Toggle Quire task',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        if (this.settings.tokenData === undefined) {
          return
        }
        toggleServerTaskStatus(editor, this.settings)
        // @ts-ignore undocumented but was recommended to use here - https://github.com/obsidianmd/obsidian-releases/pull/768#issuecomment-1038441881
        view.app.commands.executeCommandById('editor:toggle-checklist-status')
      },
    })
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
    this.addCommand({
      id: 'sync-with-quire',
      name: 'Sync with Quire',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        if (this.settings.tokenData === undefined) {
          // TODO: Throw an error and tell user to auth via Desktop
          return
        }
        this.syncWithQuire(editor)
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
