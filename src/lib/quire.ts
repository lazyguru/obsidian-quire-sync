import * as hm from 'typed-rest-client/Handlers'
import * as rm from 'typed-rest-client/RestClient'

/*
TODO:
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
    - Get all projects where we can add tasks: `https://quire.io/api/project/list?add-task=true`
      ```
      [
        {
          "name": "My Project",
          "id": "my_project",
          "rootCount": 5,
          "nameText": "My Project",
          ...
          "activeCount": 20,
          "taskCount": 30,
          "descriptionText": "This is cool!",
          "description": "This is *cool*!",
          ...
          "oid": "Dyh2YkFcu9uLgLFIeN1kB4Ld",
          ...
        }
      ]
      ```
    - Add a new task: `POST /task/{oid}` (oid can be project or parent task)
      ```
      {
        "name": "Design new **logo**",
        "yourField": "object",
        "description": "This is a *cool* task.",
        "tasks": [ # (Optional) A list of subtasks to create.
          "#/definitions/CreateTaskBody"
        ],
        "tags": [ # OID or names of the tags to be added to the new created task. Note: if tag's name is specified, it is case-insensitive.
          "X6nmx9XjEO2wKbqeB1pRT43C"
        ],
        "start": "2018-12-20T00:00:00.000Z",
        "due": "2018-12-22T00:00:00.000Z",
        "priority": 0, # An optional priority. Its value must be between -1 (lowest) and 2 (highest). Default: 0.
        "status": 0, # An optional status. Its value must be between 0 and 100. Default: 0.
        "etc": 0 # The estimated time to complete. If specified, it must be non-negative. Unit: seconds.
      }
      ```
    - Get task by OID: `GET /task/{oid}`
      Response:
      ```
      {
        "oid": "Dyh2YkFcu9uLgLFIeN1kB4Ld",
        "id": 12,
        "name": "Design new **logo**",
        "nameText": "Design new logo",
        "descriptionText": "This is a cool task.",
        "description": "This is a *cool* task.",
        ...
        "etc": 500,
        "priority": 0,
        "status": 0,
        "start": "2018-12-20T00:00:00.000Z",
        "due": "2018-12-22T00:00:00.000Z",
        ...
        "tags": [
          "#/definitions/SimpleTaggingEntity"
        ],
        "order": 99,
        ...
        "childCount": 5,
        "toggledAt": "2018-12-22T02:06:58.158Z",
        "editedAt": "2018-12-22T02:06:58.158Z",
        ...
        "project": "#/definitions/SimpleIdentity",
        "createdAt": "2018-12-22T02:06:58.158Z",
      }
      ```
    - Get all tasks: `GET /task/list/{oid}` oid can be project or parent task
    - Update task by OID: `PUT /task/{oid}`
      ```
      {
        "name": "New idea",
        ...
        "yourField": "object",
        "description": "This is a **cool** task.",
        ...
        "tags": [
          "ITaVbkhh3iVcEcV3vuSLeE2k"
        ],
        "start": "2018-12-20T00:00:00.000Z",
        "due": "2018-12-22T00:00:00.000Z",
        "priority": 0,
        "status": 100,
        "etc": 0
      }
      ```
    - Delete a task (and all subtasks): `DELETE /task/{oid}`

    BEWARE Rate Limit: https://quire.io/dev/api/#rate-limits
    Plan: Free
    Maximum requests per organization, per minute: 25
    Maximum requests per organization, per hour: 120

    The size of each request can't be larger than 1MB.
    Requests that hit this limit will receive a 413 Content too large response.
*/

export interface Task {
  id: number
  parentId: number
  name: string
  description: string
  tags: string[]
  start: Date
  due: Date
  priority: number
  status: {
    color: string
    name: string
    value: number
  }
  etc: number
}
export default class QuireApi {
  async reopenTask(taskId: string): Promise<Task|null> {
    return (
      await this.client.replace<Task>(`/api/task/${taskId}`, { status: 0 })
    ).result
  }
  async closeTask(taskId: string): Promise<Task|null> {
    console.log(await this.getTask(taskId))
    return (
      await this.client.replace<Task>(`/api/task/${taskId}`, { status: 100 })
    ).result
  }
  client: rm.RestClient
  constructor(accessToken: string) {
    this.client = new rm.RestClient('obsidian-quire-sync', 'https://quire.io', [
      new hm.BearerCredentialHandler(accessToken),
    ])
  }
  async getTask(oid: string): Promise<Task | null> {
    return (await this.client.get<Task>(`/api/task/${oid}`)).result
  }
  async getTasks(oid?: string): Promise<unknown | Task[]> {
    if (oid) {
      return (
        (await this.client.get<Task[]>(`/api/task/list/id/${oid}`)).result ?? []
      )
    }
    return (await this.client.get('/api/task/list/')).result ?? []
  }
}
