import { PLUGIN_NAME } from 'src/main'
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
  id?: number
  oid?: string
  parentId?: number
  name: string
  description?: string
  tags?: Tag[]
  created?: string
  start?: string
  scheduled?: string
  due?: string
  toggledAt?: string
  priority: TaskPriority
  status: TaskStatus
  etc?: number
  recurring: TaskRecurring|null
}

export interface TaskPriority {
  name: string
  value: number
}

export interface TaskRecurring {
  type: number // 0=weekly, 1=monthly, 2=yearly, 3=custom
  data?: number // It depends on the type of this recurring. If weekly, bit 0 is Sunday, bit 1 is Monday and so on. For example, if the data is 6, it means every Monday and Tuesday.
  rate: number // How often this recurring shall occur. If the rate is 2 and the type is weekly, it means it shall occur every two week. If the type is custom, it means number of days to repeat.
  end?: string // When this recurring shall end. If not specified, it means it is never end.
}

export interface TaskStatus {
  color?: string
  name: string
  value: number
}
export interface Tag {
  oid: string
  name: string
  global: boolean
}
export default class QuireApi {
  client: rm.RestClient
  projectId: string
  constructor(accessToken: string, projectId: string) {
    this.client = new rm.RestClient('obsidian-quire-sync', 'https://quire.io', [
      new hm.BearerCredentialHandler(accessToken),
    ])
    this.projectId = projectId
  }
  async createTask(task: Task, parentId?: string): Promise<Task> {
    let root = this.projectId
    if (parentId !== undefined) {
      root = parentId
    }
    const res = await this.client.create<Task>(`/api/task/id/${root}`, {
      name: task.name,
      description: task.description,
      status: task.status.value,
      priority: task.priority.value,
      tags: task.tags ? task.tags.map((t) => t.name) : undefined,
      etc: task.etc,
      start: task.start ? task.start.substring(0, 10) : null,
      due: task.due ? task.due.substring(0, 10) : null,
      recurring: task.recurring,
    })
    if (res.statusCode >= 200 && res.statusCode < 300 && res.result !== null) {
      return res.result
    }
    console.error(`API returned status: ${res.statusCode}`)
    throw Error(`${PLUGIN_NAME}: Failed to create task: ${task.name}`)
  }
  async createTag(tagName: string): Promise<void> {
    const res = await this.client.create(`/api/tag/id/${this.projectId}`, {
      name: tagName,
      global: true,
    })
    if (res.statusCode >= 200 && res.statusCode < 300 && res.result !== null) {
      return
    }
    console.error(`API returned status: ${res.statusCode}`)
    throw Error(`Failed to create tag: ${tagName}`)
  }
  async getAllTags(): Promise<Tag[]> {
    const res = await this.client.get<Tag[]>(
      `/api/tag/list/id/${this.projectId}`
    )
    if (res.statusCode >= 200 && res.statusCode < 300 && res.result !== null) {
      return res.result
    }
    console.error(`API returned status: ${res.statusCode}`)
    return []
  }
  async updateTask(task: Task) {
    return (
      await this.client.replace<Task>(`/api/task/${task.oid}`, {
        name: task.name,
        description: task.description,
        status: task.status.value,
        priority: task.priority.value,
        tags: task.tags ? task.tags.map((t) => t.name) : undefined,
        etc: task.etc,
        start: task.start ? task.start.substring(0, 10) : null,
        due: task.due ? task.due.substring(0, 10) : null,
        recurring: task.recurring,
      })
    ).result
  }
  async reopenTask(taskId: string): Promise<Task | null> {
    return (
      await this.client.replace<Task>(`/api/task/${taskId}`, { status: 0 })
    ).result
  }
  async closeTask(taskId: string): Promise<Task | null> {
    return (
      await this.client.replace<Task>(`/api/task/${taskId}`, { status: 100 })
    ).result
  }
  async getTask(oid: string): Promise<Task> {
    const res = await this.client.get<Task>(`/api/task/${oid}`)
    if (res.statusCode >= 200 && res.statusCode < 300 && res.result !== null) {
      return res.result
    }
    console.error(`API returned status: ${res.statusCode}`)
    throw Error(`${PLUGIN_NAME}: Unable to retrieve task from Quire API`)
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
