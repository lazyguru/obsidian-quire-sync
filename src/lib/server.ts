import * as rm from 'typed-rest-client/RestClient'
import * as http from 'http'
import { OQSyncSettings } from 'src/settings'

/**
  - Open browser for authentication https://quire.io/oauth?client_id=your-client-ID&redirect_uri=your-redirect-uri
    Redirects to url with parameters `code` and `host` (we only care about `code`)
  - Post to https://quire.io/oauth/token with:
      Parameter     Value
      grant_type    authorization_code
      code          {your-authorization-code}
      client_id     {your-client-ID}
      client_secret {your-client-secret}
    Response:
    ```
    {
      "access_token": "ACCESS_TOKEN",
      "token_type": "bearer",
      "expires_in": 2592000,
      "refresh_token": "REFRESH_TOKEN"
    }
    ```
  - NOTE: A refresh token might stop working for one of these reasons:
    - The user has revoked your app's access.
    - The refresh token has not been used for 6 months.
 */

async function postBack(settings: OQSyncSettings, code: string) {
  const data: string = `grant_type=authorization_code&code=${code}&client_id=${settings.clientId}&client_secret=${settings.clientSecret}`
  const rest = getClient()
  const res = await rest.client.post(
    'https://quire.io/oauth/token',
    data,
    {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    }
  )
  settings.tokenData = JSON.parse(await res.readBody())
}

export function startServer(
  host: string,
  port: number,
  settings: OQSyncSettings,
  saveSettings: CallableFunction
): http.Server {
  const requestListener: http.RequestListener = async function (
    req: http.IncomingMessage,
    res
  ) {
    const url = new URL(`http://${host}:${port}/${req.url}`)
    const code = url.searchParams.get('code')
    if (code === null) {
      res.writeHead(400)
      res.end('Code is missing or invalid')
      return
    }
    res.writeHead(200)
    res.end('Auth with Quire complete. You can close this window now')
    await postBack(settings, code)
    saveSettings(settings)
  }

  const server = http.createServer(requestListener)
  server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`)
  })
  return server
}

function getClient(): rm.RestClient {
  // TODO: Extract this to a seperate file and export
  return new rm.RestClient('obsidian-quire-sync', 'https://quire.io')
}
