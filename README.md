# Obsidian Quire Sync

This project uses Typescript to provide type checking and documentation.
The repo depends on the latest plugin API (obsidian.d.ts) in Typescript Definition format, which contains TSDoc comments describing what it does.

This plugin allows the synchronization of tasks between Obsidian and [Quire](https://quire.io). This is done using a special identifier format `[QuireId:<oid>]` where `<oid>` is the Quire OID of a task. NOTE: This identifier MUST come before all emojis on the task line due to a [limitation](https://publish.obsidian.md/tasks/Getting+Started/Auto-Suggest#What+do+I+need+to+know+about+the+order+of+items+in+a+task%3F) in the Obsidian Tasks plugin

- Adds a command "Push to Quire" which pushes tasks to Quire.
- Adds a command "Pull from Quire" which pulls tasks from Quire.
- Adds a command "Toggle Quire task" to mark a task as done/reopened in Quire.
- Adds a command "Authenticate with Quire" which authenticates with Quire and retrieves a refresh-token for use in interacting with the Quire API.
  - NOTE: This command is only available on desktop. However, the auth token is saved and usable on mobile if you have sync setup (can be Obsidian Sync or another form of sync)

### Not supported

- As Quire doesn't have a field for `scheduled`, that field is not pushed to Quire. However, if you have it set in Obsidian, it will be maintained (not overwritten)

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
