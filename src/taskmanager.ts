import QuireApi from './lib/quire'
import { Editor, Notice } from 'obsidian'
import { PLUGIN_NAME } from './main'

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

export async function toggleServerTaskStatus(
  e: Editor,
  access_token: string
) {
  try {
    const lineText = e.getLine(e.getCursor().line)
    const taskId = getTaskId(lineText)
    if (taskId === false) {
      return
    }

    const api = new QuireApi(access_token)
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
