# Obsidian Quire Sync

This project uses Typescript to provide type checking and documentation.
The repo depends on the latest plugin API (obsidian.d.ts) in Typescript Definition format, which contains TSDoc comments describing what it does.

This plugin allows the synchronization of tasks between Obsidian and [Quire](https://quire.io).

- Adds a ribbon icon, which triggers a sync when clicked.
- Adds a command "Sync with Quire" which syncs tasks with Quire.
- Adds a command "Authenticate with Quire" which authenticates with Quire and retrieves a refresh-token for use in interacting with the Quire API.

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v18 (`node --version`).
- `npm i` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-quire-sync/`.

## Security

This plugin stores your client-id, client-secret, as well as refresh and access tokens in plain text in your .obsidian/plugins folder. Anyone with these tokens could access and manipulate your Quire data based on whatever permissions you granted the application when you registered it. Ensure that you are not syncing/sharing your .obsidian/plugins folder for security purposes (or at the very least ensure it is done so in a secure way). Use this plugin at your own risk

## Support

If you like this plugin or want to support further development, you can [Buy Me a Coffee](https://www.buymeacoffee.com/lazyguru) or support via [GitHub](https://github.com/sponsors/lazyguru).
Please report bugs and request features in [GitHub Issues](https://github.com/lazyguru/obsidian-quire-sync/issues)

## Special Thanks

I copied some of the sync functionality from [wesmoncrief](https://github.com/wesmoncrief/obsidian-todoist-text/). Thanks, your plugin is almost exactly what I wanted to do here. (also, thanks for the security notice. Mine is heavily inspired by yours)
