import QuireApi, { Task, TaskPriority, TaskStatus, TaskRecurring, Tag } from './lib/quire'
import { Editor, Notice } from 'obsidian'
import { PLUGIN_NAME } from './main'
import { OQSyncSettings } from './settings'

function getTaskId(lineText: string): string|false {
  // The line must start with only whitespace, then have a dash. A currently checked off box
  // can have any non-whitespace character. This matches the behavior of Obsidian's
  // editor:toggle-checklist-status command.
  const isTaskRegex = /^\s*- \[(\s|\S)]/
  const isTask = isTaskRegex.test(lineText)

  if (!lineText.contains('@QuireId:') && isTask) {
    return false
  }

  try {
    return lineText.split('@QuireId:')[1].split(' ')[0]
  } catch (e) {
    console.log(e)
    return false
  }
}

export async function pushTask(e: Editor, settings: OQSyncSettings) {
  try {
    if (settings.tokenData === undefined) {
      new Notice(PLUGIN_NAME + ": Please authenticate using a desktop version of Obsidian");
      throw PLUGIN_NAME + ': missing access token.'
    }
    const access_token = settings.tokenData.access_token
    const lineText = e.getLine(e.getCursor().line)
    const taskId = getTaskId(lineText)
    if (taskId === false) {
      return
    }
    const projectId = settings.defaultProject ?? ''
    const api = new QuireApi(access_token, projectId)
    const task = await api.getTask(taskId)
    if (task === null) {
      return
    }
    const updateTask: Task = {
      id: task.id,
      oid: task.oid,
      parentId: task.parentId,
      name: getTaskName(lineText),
      status: getTaskStatus(lineText),
      priority: getTaskPriority(lineText),
      due: getTaskDue(lineText),
      start: getTaskStart(lineText),
      tags: getTaskTags(lineText, task.tags),
      etc: task.etc,
      description: task.description,
      // description = getTaskDescription(lineText)
      recurring: getTaskRecurring(lineText),
    }
    if (updateTask.tags !== undefined) {
      const tags = await api.getAllTags()
      const tagNames = tags.map((t) => t.name)
      const missingTags = updateTask.tags.filter((t) => !tagNames.contains(t.name))
      missingTags.map(async (t) => await api.createTag(t.name))
    }
    await api.updateTask(updateTask)
  } catch (e) {
    console.log(`${PLUGIN_NAME} error: `, e)
    new Notice(
      `${PLUGIN_NAME}: Error trying to sync task. See console log for more details.`
    )
  }
}

export async function toggleServerTaskStatus(
  e: Editor,
  settings: OQSyncSettings
) {
  try {
    if (settings.tokenData === undefined) {
      new Notice(PLUGIN_NAME + ": Please authenticate using a desktop version of Obsidian");
      throw PLUGIN_NAME + ': missing access token.'
    }
    const access_token = settings.tokenData.access_token
    const lineText = e.getLine(e.getCursor().line)
    const taskId = getTaskId(lineText)
    if (taskId === false) {
      return
    }

    const projectId = settings.defaultProject ?? ''
    const api = new QuireApi(access_token, projectId)
    const task = (await api.getTask(taskId))
    if (task === null) {
      return
    }
    if (task.status.value < 100) {
      await api.closeTask(taskId)
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
      await api.reopenTask(taskId)
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
        taskOpenedMessage = taskOpenedMessage + ` and its parent task${plural}.`
      }
      new Notice(taskOpenedMessage)
    }
  } catch (e) {
    console.log(`${PLUGIN_NAME} error: `, e)
    new Notice(
      `${PLUGIN_NAME}: Error trying to update task status. See console log for more details.`
    )
  }
}
function getTaskName(lineText: string): string {
  const taskNameRegex = /^\s*-\s\[(?:\s|\S)\]\s([^\p{ExtPict}]+)(?:\s[\p{ExtPict}]|@QuireId:)*/u
  const matches = taskNameRegex.exec(lineText)
  if (matches !== null && matches.length > 1) {
    return matches[1].trim()
  }
  return ''
}

/*
Possible task fields:
 - [ ] Test task 📅 2023-09-21 🛫 2023-09-21 ⏳ 2023-09-21 ⏫ 🔁 every day ➕ 2023-09-21 ✅ 2023-09-23 @QuireId:qyXJelLSDMQNrAjtH9CSuc1v

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

function getTaskStatus(lineText: string): TaskStatus {
  const isClosedRegex = /^\s*- \[(x|X)]/
  const isInProgressRegex = /^\s*- \[(\\)]/
  const closed = isClosedRegex.test(lineText)
  const inProgress = isInProgressRegex.test(lineText)
  if (closed) {
    return {
      name: 'Completed',
      value: 100
    } as TaskStatus
  }
  if (inProgress) {
    return {
      name: 'Doing',
      value: 50
    } as TaskStatus
  }
  return {
    name: 'To-Do',
    value: 0
  } as TaskStatus
}

function getTaskPriority(lineText: string): TaskPriority {
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

function getTaskStart(lineText: string): Date | undefined {
  return getDateMatch(lineText, '🛫')
}

function getTaskDue(lineText: string): Date | undefined {
  const match = getDateMatch(lineText, '📅')
  console.log('due', match)
  return match
}

function getScheduled(lineText: string): Date | undefined {
  return getDateMatch(lineText, '⏳')
}

function getDateMatch(lineText: string, emoji: string): Date | undefined {
  const regexString = `${emoji} *(\\d{4}-\\d{2}-\\d{2})`
  const dateRegex = new RegExp(regexString, 'u')
  const date = dateRegex.exec(lineText)
  if (date !== null && date.length > 0) {
    return new Date(date[0])
  }
  return undefined
}
function getTaskRecurring(lineText: string): TaskRecurring | null {
  const recurringRegex = /🔁(?: ?every ?)?(day|week|month|year)?(?: on )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)?/mui
  const recurring = recurringRegex.exec(lineText)
  console.log(recurring)
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

function getTaskTags(lineText: string, initTags?: Tag[]): Tag[] | undefined {
  const tags: string[] = []
  if (initTags !== undefined) {
    initTags.filter((t) => t.name !== null).map((t) => tags.push(t.name))
  }
  const tagsRegex = /#([a-z0-9_]+)/uig
  const match = lineText.match(tagsRegex)
  console.log('Match', match)
  if (match !== null && match.length > 0) {
    match.map((m) => tags.push(m.replace('#', '')))
  }
  return tags.length > 0 ? tags.unique().map((tn) => ({ name: tn } as Tag)) : undefined
}
