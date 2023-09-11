/*
TODO:
  - Call for authentication https://quire.io/oauth?client_id=your-client-ID&redirect_uri=your-redirect-uri
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
  - After auth:
    - `curl -H 'Authorization: Bearer {access_token}' https://quire.io/api/user/id/me`
      ```
      {
        "email": "john@gmail.cc",
        "website": "https://coolwebsites.com",
        "id": "My_ID",
        "description": "This is *cool*!",
        "url": "https://quire.io/u/My_ID",
        "nameText": "My Name",
        "nameHtml": "My Name",
        "descriptionText": "This is cool!",
        "descriptionHtml": "This is <i>cool</i>!",
        "image": "https://quire.s3.amazonaws.com/oid/image.jpg",
        "iconColor": "37",
        "name": "My Name",
        "oid": "Dyh2YkFcu9uLgLFIeN1kB4Ld"
      }
      ```
*/
