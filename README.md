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

## Support

If you like this plugin or want to support further development, you can [Buy Me a Coffee](https://www.buymeacoffee.com/lazyguru) or support via [GitHub](https://github.com/sponsors/lazyguru).
Please report bugs and request features in [GitHub Issues](https://github.com/lazyguru/obsidian-quire-sync/issues)
