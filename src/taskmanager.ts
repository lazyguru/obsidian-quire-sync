import QuireApi, { Task, TaskPriority, TaskStatus, TaskRecurring, Tag } from './lib/quire'
import { App, Editor, Notice } from 'obsidian'
import { PLUGIN_NAME } from './main'
import { OQSyncSettings } from './settings'

/*
Possible task fields:
 - [ ] Test task [QuireId:qyXJelLSDMQNrAjtH9CSuc1v] 📅 2023-09-21 🛫 2023-09-21 ⏳ 2023-09-21 ⏫ 🔁 every day ➕ 2023-09-21 ✅ 2023-09-23

 Name: Test task
 Due: 📅 2023-09-21
 Start: 🛫 2023-09-21
 Scheduled: ⏳ 2023-09-21
 Priority: (one of: [🔺,⏫,🔼,🔽,⏬])
 Recurring: 🔁 every day|week|month
 Created: ➕ 2023-09-21
 Done: ✅ 2023-09-23
 QuireID: @QuireId:qyXJelLSDMQNrAjtH9CSuc1v
*/
export default class TaskManager {
  app: App
  api: QuireApi
  settings: OQSyncSettings
  constructor(app: App, settings: OQSyncSettings) {
    this.app = app
    this.settings = settings
    if (this.settings.tokenData !== undefined) {
      const access_token = this.settings.tokenData.access_token
      this.api = new QuireApi(access_token, this.settings.defaultProject ?? '')
    }
  }
  getTaskId(lineText: string): string | false {
    // The line must start with only whitespace, then have a dash. A currently checked off box
    // can have any non-whitespace character. This matches the behavior of Obsidian's
    // editor:toggle-checklist-status command.
    const isTaskRegex = /^\s*- \[(\s|\S)]/
    const isTask = isTaskRegex.test(lineText)

    if (!lineText.contains('[QuireId:') && isTask) {
      return false
    }

    try {
      return lineText.split('[QuireId:')[1].split(']')[0]
    } catch (e) {
      console.error(e)
      return false
    }
  }
  async getProjectId(defaultValue?: string): Promise<string> {
    let projectId = defaultValue
    const activeFile = this.app.workspace.getActiveFile()
    if (activeFile === null) {
      new Notice(
        `${PLUGIN_NAME}: Please open a file before attempting to sync with Quire`
      )
      throw Error(`${PLUGIN_NAME}: Please open a file first`)
    }
    await this.app.fileManager.processFrontMatter(activeFile, (fm) => {
      if (fm.QuireProject !== undefined) {
        projectId = fm.QuireProject
      }
    })
    return projectId ?? ''
  }
  async pushTask(e: Editor) {
    try {
      this.api.projectId = await this.getProjectId(this.settings.defaultProject)
      const lineText = e.getLine(e.getCursor().line)
      const taskId = this.getTaskId(lineText)
      let task: Task
      if (taskId !== false) {
        task = await this.api.getTask(taskId)
      } else {
        const taskToCreate = this.readTaskFromLine(lineText, [])
        await this.syncTags(taskToCreate)
        task = await this.api.createTask(taskToCreate)
        e.setLine(e.getCursor().line, this.getFormattedTask(task))
        return
      }
      if (task === null) {
        return
      }
      const updateTask = this.readTaskFromLine(lineText, task.tags ?? [])
      await this.syncTags(updateTask)
      await this.api.updateTask(updateTask)
    } catch (e) {
      console.error(`${PLUGIN_NAME} error: `, e)
      new Notice(
        `${PLUGIN_NAME}: Error trying to sync task. See console log for more details.`
      )
    }
  }
  async syncTags(task: Task) {
    if (task.tags !== undefined) {
      const tags = await this.api.getAllTags()
      const tagNames = tags.map((t) => t.name)
      const missingTags = task.tags.filter((t) => !tagNames.contains(t.name))
      missingTags.map(async (t) => await this.api.createTag(t.name))
    }
  }
  async pullTask(e: Editor) {
    try {
      this.api.projectId = await this.getProjectId(this.settings.defaultProject)
      const lineText = e.getLine(e.getCursor().line)
      const taskId = this.getTaskId(lineText)
      if (taskId === false) {
        return
      }
      const task = await this.api.getTask(taskId)
      if (task === null) {
        return
      }
      task.scheduled = this.getTaskScheduled(lineText)
      e.setLine(e.getCursor().line, this.getFormattedTask(task))
    } catch (e) {
      console.error(`${PLUGIN_NAME} error: `, e)
      new Notice(
        `${PLUGIN_NAME}: Error trying to sync task. See console log for more details.`
      )
    }
  }
  async toggleServerTaskStatus(e: Editor) {
    try {
      this.api.projectId = await this.getProjectId(this.settings.defaultProject)
      const lineText = e.getLine(e.getCursor().line)
      const taskId = this.getTaskId(lineText)
      if (taskId === false) {
        return
      }

      const task = await this.api.getTask(taskId)
      if (task === null) {
        return
      }
      if (task.status.value < 100) {
        await this.api.closeTask(taskId)
        const actionedTaskTabCount = lineText.split(/[^\t]/)[0].length

        // check if there are any subtasks and mark them closed
        let subtasksClosed = 0
        for (let line = e.getCursor().line + 1; line < e.lineCount(); line++) {
          const lineText = e.getLine(line)
          const tabCount = lineText.split(/[^\t]/)[0].length
          if (tabCount == 0) break

          if (tabCount > actionedTaskTabCount) {
            const replacedText = lineText.replace('- [ ]', '- [x]')
            if (replacedText != lineText) {
              subtasksClosed++
            }
            e.setLine(line, replacedText)
          }
        }

        // advise user task is closed, along with any subtasks if they were found
        let taskClosedMessage = `${PLUGIN_NAME}: Marked as done on Quire`
        if (subtasksClosed > 0) {
          const plural = subtasksClosed == 1 ? '' : 's'
          taskClosedMessage =
            taskClosedMessage + ` and ${subtasksClosed} subtask${plural}.`
        }
        new Notice(taskClosedMessage)
      }

      if (task.status.value === 100) {
        await this.api.reopenTask(taskId)
        const actionedTaskTabCount = lineText.split(/[^\t]/)[0].length

        // check if there are any parent tasks and mark them opened
        let parentTasksOpened = 0
        for (let line = e.getCursor().line - 1; line > 1; line--) {
          const lineText = e.getLine(line)
          const tabCount = lineText.split(/[^\t]/)[0].length

          if (tabCount < actionedTaskTabCount) {
            const replacedText = lineText
              .replace('- [X]', '- [ ]')
              .replace('- [x]', '- [ ]')
            if (replacedText != lineText) {
              parentTasksOpened++
            }
            e.setLine(line, replacedText)
          }

          if (tabCount == 0 && parentTasksOpened > 0) break // found the topmost task
        }

        // advise user task is open, along with any parent tasks if they were found
        let taskOpenedMessage = `${PLUGIN_NAME}: Re-opened on Quire`
        if (parentTasksOpened > 0) {
          const plural = parentTasksOpened == 1 ? '' : 's'
          taskOpenedMessage =
            taskOpenedMessage + ` and its parent task${plural}.`
        }
        new Notice(taskOpenedMessage)
      }
    } catch (e) {
      console.error(`${PLUGIN_NAME} error: `, e)
      new Notice(
        `${PLUGIN_NAME}: Error trying to update task status. See console log for more details.`
      )
    }
  }
  getTaskName(lineText: string): string {
    const taskNameRegex =
      /^\s*-\s\[(?:\s|\S)\]\s([^\p{ExtPict}[]+)(?:\s[\p{ExtPict}]|\[QuireId:.*\])*/u
    const matches = taskNameRegex.exec(lineText)
    if (matches !== null && matches.length > 1) {
      return matches[1].trim()
    }
    return ''
  }
  getTaskStatus(lineText: string): TaskStatus {
    const isClosedRegex = /^\s*- \[(x|X)]/
    const isInProgressRegex = /^\s*- \[(\\)]/
    const closed = isClosedRegex.test(lineText)
    const inProgress = isInProgressRegex.test(lineText)
    if (closed) {
      return {
        name: 'Completed',
        value: 100,
      } as TaskStatus
    }
    if (inProgress) {
      return {
        name: 'Doing',
        value: 50,
      } as TaskStatus
    }
    return {
      name: 'To-Do',
      value: 0,
    } as TaskStatus
  }
  getTaskPriority(lineText: string): TaskPriority {
    const priorityRegex = /[🔺⏫🔼🔽⏬]/u
    const priority = priorityRegex.exec(lineText)
    if (priority !== null && priority.length > 0) {
      const value = String.fromCharCode(parseInt(priority[0], 16))
      switch (value) {
        case '⏬':
          return {
            name: 'Low',
            value: -1,
          }
        case '🔽':
        // low and medium get treated as 'default' because Quire only supports
        // 4 priorities. This will be a problem on parsing the results back
        // from the server as a task that was initially set as 🔽 might now get
        // set as 🔼 since we have to pick one
        // eslint-disable-next-line no-fallthrough
        case '🔼':
          return {
            name: 'Medium',
            value: 0,
          }
        case '⏫':
          return {
            name: 'High',
            value: 1,
          }
        case '🔺':
          return {
            name: 'Urgent',
            value: 2,
          }
      }
    }
    // If we don't match, then return 'default', because the user might not
    // have set a priority previously
    return {
      name: 'Medium',
      value: 0,
    }
  }
  getTaskStart(lineText: string): string | undefined {
    return this.getDateMatch(lineText, '🛫')
  }
  getTaskDue(lineText: string): string | undefined {
    const match = this.getDateMatch(lineText, '📅')
    return match
  }
  getTaskScheduled(lineText: string): string | undefined {
    return this.getDateMatch(lineText, '⏳')
  }
  getDateMatch(lineText: string, emoji: string): string | undefined {
    const regexString = `${emoji} *(\\d{4}-\\d{2}-\\d{2})`
    const dateRegex = new RegExp(regexString, 'u')
    const date = dateRegex.exec(lineText)
    if (date !== null && date.length > 0) {
      return date[0].replace(emoji, '').trim() // seems excessive, regex should "just work"
    }
    return undefined
  }
  getTaskRecurring(lineText: string): TaskRecurring | null {
    const recurringRegex =
      /🔁(?: ?every ?)?(day|week|month|year)?(?: on )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)?/imu
    const recurring = recurringRegex.exec(lineText)
    if (recurring !== null && recurring.length > 0) {
      switch (recurring[1]) {
        case undefined:
        case 'day':
          return {
            type: 3,
            rate: 1,
          }
        case 'week':
          return {
            type: 0,
            // data: 1, // need to calculate this
            rate: 1,
          }
        case 'month':
          return {
            type: 1,
            // data: 1, // need to calculate this
            rate: 1,
          }
        case 'year':
          return {
            type: 2,
            // data: 1, // need to calculate this
            rate: 1,
          }
      }
    }
    return null
  }
  getTaskTags(lineText: string, initTags?: Tag[]): Tag[] | undefined {
    const tags: string[] = []
    if (initTags !== undefined) {
      initTags.filter((t) => t.name !== null).map((t) => tags.push(t.name))
    }
    const tagsRegex = /#([a-z0-9_]+)/giu
    const match = lineText.match(tagsRegex)
    if (match !== null && match.length > 0) {
      match.map((m) => tags.push(m.replace('#', '')))
    }
    return tags.length > 0
      ? tags.unique().map((tn) => ({ name: tn }) as Tag)
      : undefined
  }
  getFormattedTask(task: Task): string {
    let output = '- ['
    if (task.status.value === 50) {
      output += '/' // in progress
    } else if (task.status.value > 50) {
      output += 'x' // done
    } else {
      output += ' ' // open
    }
    output += `] ${task.name} [QuireId:${task.oid}]`
    switch (task.priority.value) {
      case -1:
        output += ' ⏬'
        break
      case 0:
        output += ' 🔼'
        break
      case 1:
        output += ' ⏫'
        break
      case 2:
        output += ' 🔺'
        break
    }
    if (task.created !== undefined) {
      //TODO: Only do this if user has turned this setting on
      output += ` ➕ ${task.created.substring(0, 10)}`
    }
    if (task.start !== undefined) {
      output += ` 🛫 ${task.start.substring(0, 10)}`
    }
    if (task.scheduled !== undefined) {
      // TODO: This is doubling up
      output += ` ⏳ ${task.scheduled.substring(0, 10)}`
    }
    if (task.due !== undefined) {
      output += ` 📅 ${task.due}`
    }
    if (task.status.value === 100 && task.toggledAt !== undefined) {
      output += ` ✅ ${task.toggledAt.substring(0, 10)}`
    }
    if (task.recurring !== undefined) {
      output += this.getQuireRecurring(task.recurring)
    }
    return output
  }
  getQuireRecurring(r: TaskRecurring | null): string {
    if (r === null) {
      return ''
    }
    let output = ' 🔁'
    switch (r.type) {
      case 0: // Week
        if (r.rate === 1) {
          output += ' every week'
          break
        }
        output += ` every ${r.rate} week on `
        // switch (r.data) {
        //   //TODO: need to calculate
        // }
        break
      case 1: // Month
        if (r.rate === 1) {
          output += ' every month'
          break
        }
        output += ` every ${r.rate} month on `
        // switch (r.data) {
        //   //TODO: need to calculate
        // }
        break
      case 2: // Year
        if (r.rate === 1) {
          output += ' every year'
          break
        }
        output += ` every ${r.rate} year on `
        // switch (r.data) {
        //   //TODO: need to calculate
        // }
        break
      case 3: // Custom (Day)
        if (r.rate === 1) {
          output += ' every day'
          break
        }
        output += ` every ${r.rate} day`
        break
    }
    return output
  }
  readTaskFromLine(lineText: string, initTags: Tag[]): Task {
    return {
      name: this.getTaskName(lineText),
      status: this.getTaskStatus(lineText),
      priority: this.getTaskPriority(lineText),
      due: this.getTaskDue(lineText),
      start: this.getTaskStart(lineText),
      tags: this.getTaskTags(lineText, initTags),
      // description = this.getTaskDescription(lineText)
      recurring: this.getTaskRecurring(lineText),
    }
  }
}
