import { App, ButtonComponent, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface OQSyncSettings {
	clientId: string;
	clientSecret: string;
}

const DEFAULT_SETTINGS: OQSyncSettings = {
	clientId: '',
	clientSecret: '',
}

export default class OQSync extends Plugin {
	settings: OQSyncSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('sync', 'OQSync', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Synced with Quire!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('oqsync-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('OQSync status: ???');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'auth-with-quire',
			name: 'Authenticate with Quire',
			callback: () => {
				new QuireAuthModal(this.app).open();
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'sync-with-quire',
			name: 'Sync with Quire',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const hasAuthToken = false; //TODO: Add check to see if we have an auth token
				if (hasAuthToken) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new QuireSyncModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new OQSyncSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class QuireSyncModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class QuireAuthModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class OQSyncSettingTab extends PluginSettingTab {
	plugin: OQSync;

	constructor(app: App, plugin: OQSync) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setHeading()
			.setName('Quire API Settings')
			.setDesc('Create these at https://quire.io/apps/dev')
			.addButton((cb) => cb.setButtonText('Register app with Quire').onClick(() => window.open('https://quire.io/apps/dev')));

		new Setting(containerEl)
			.setName('Client ID')
			.setDesc('Client ID from Quire App (can be Development credentials)')
			.addText(text => text
				.setPlaceholder('Enter your client id')
				.setValue(this.plugin.settings.clientId)
				.onChange(async (value) => {
					this.plugin.settings.clientId = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Client Secret')
			.setDesc('Client Secret from Quire App (can be Development credentials)')
			.addText(text => text
				.setPlaceholder('Enter your client secret')
				.setValue(this.plugin.settings.clientSecret)
				.onChange(async (value) => {
					this.plugin.settings.clientSecret = value;
					await this.plugin.saveSettings();
				}));
	}
}
