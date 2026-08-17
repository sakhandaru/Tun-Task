import { db } from '../db/schema'
import { getFileContent, updateFileContent } from './githubClient'
import { serializeTodos, serializeHabits, parseTodos, parseHabits } from './markdownSerializer'
import type { Todo, HabitLog } from '../db/types'

export type SyncStatus = 'idle' | 'waiting' | 'syncing' | 'success' | 'error'

export interface SyncState {
  status: SyncStatus
  lastSync?: string
  error?: string
}

let state: SyncState = {
  status: 'idle',
  lastSync: localStorage.getItem('tuntask_last_sync') || undefined,
  error: undefined,
}

type Listener = (state: SyncState) => void
const listeners = new Set<Listener>()

export function getSyncState(): SyncState {
  return { ...state }
}

export function subscribeSyncState(listener: Listener): () => void {
  listeners.add(listener)
  listener(state)
  return () => {
    listeners.delete(listener)
  }
}

function updateState(updates: Partial<SyncState>) {
  state = { ...state, ...updates }
  if (updates.lastSync) {
    localStorage.setItem('tuntask_last_sync', updates.lastSync)
  }
  listeners.forEach((l) => l(state))
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let activeSyncPromise: Promise<void> | null = null
let syncPending = false

export function scheduleSync(): void {
  const autoSync = localStorage.getItem('tuntask_sync_auto') !== 'false'
  if (!autoSync) return

  updateState({ status: 'waiting' })

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void triggerSync()
  }, 3000)
}

export async function triggerSync(): Promise<void> {
  if (activeSyncPromise) {
    syncPending = true
    return
  }

  const pat = localStorage.getItem('tuntask_sync_pat') || ''
  const repo = localStorage.getItem('tuntask_sync_repo') || ''
  const tasksPath = localStorage.getItem('tuntask_sync_tasks_path') || 'TunTask/tasks.md'
  const habitsPath = localStorage.getItem('tuntask_sync_habits_path') || 'TunTask/habits.md'

  if (!pat || !repo) {
    updateState({ status: 'idle', error: 'GitHub PAT atau Repo belum diatur' })
    return
  }

  updateState({ status: 'syncing', error: undefined })

  activeSyncPromise = performSync(pat, repo, tasksPath, habitsPath)
    .then(() => {
      updateState({
        status: 'success',
        lastSync: new Date().toISOString(),
        error: undefined,
      })
    })
    .catch((err: Error) => {
      console.error('Sync failed:', err)
      updateState({
        status: 'error',
        error: err.message || 'Gagal sinkronisasi',
      })
    })
    .finally(() => {
      activeSyncPromise = null
      if (syncPending) {
        syncPending = false
        void triggerSync()
      }
    })

  return activeSyncPromise
}

async function getDirectoryContents(pat: string, repo: string, path: string): Promise<any[]> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${pat}`,
      Accept: 'application/vnd.github.v3+json',
      'Cache-Control': 'no-cache',
    },
  })

  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub directory listing error (${response.status}): ${errorText}`)
  }

  return response.json()
}

async function performSync(
  pat: string,
  repo: string,
  tasksPath: string,
  habitsPath: string
): Promise<void> {
  const syncTime = new Date().toISOString()

  // --- PART 1: TASKS SYNC ---
  const localTodos = await db.todos.toArray()
  const remoteTasksFile = await getFileContent(pat, repo, tasksPath)
  const parsedRemoteTodos = remoteTasksFile.content ? parseTodos(remoteTasksFile.content) : []

  const mergedTodos: Todo[] = []
  const todosToUpdateLocally: Todo[] = []
  const todoIdsToDeleteLocally: string[] = []

  // Create lookup maps
  const localTodosMap = new Map(localTodos.map((t) => [t.id, t]))
  const remoteTodosMap = new Map(parsedRemoteTodos.map((t) => [t.id, t]))

  // Union of all IDs
  const allTodoIds = new Set([...localTodosMap.keys(), ...remoteTodosMap.keys()])

  for (const id of allTodoIds) {
    const local = localTodosMap.get(id)
    const remote = remoteTodosMap.get(id)

    if (local && remote) {
      // Exist in both: reconcile state
      if (!local.syncedAt) {
        // Local has unsynced updates (dirty state) -> Local wins
        const updatedLocal = { ...local, syncedAt: syncTime }
        mergedTodos.push(updatedLocal)
        todosToUpdateLocally.push(updatedLocal)
      } else {
        // Local was clean -> Remote state wins
        mergedTodos.push({ ...remote, syncedAt: syncTime })
        // If local is different from remote, update it locally
        if (
          local.completedAt !== remote.completedAt ||
          local.cancelledAt !== remote.cancelledAt ||
          local.dueDate !== remote.dueDate ||
          local.title !== remote.title ||
          local.priority !== remote.priority
        ) {
          todosToUpdateLocally.push({ ...remote, syncedAt: syncTime })
        }
      }
    } else if (remote) {
      // Exists on remote but not locally
      const lastSync = localStorage.getItem('tuntask_last_sync')
      if (lastSync) {
        // We have synced before, so if it's not local, it must have been deleted locally
        // Do nothing (don't add to merged, which means it will be deleted from remote file)
      } else {
        // Initial sync: create it locally
        const newLocal = { ...remote, syncedAt: syncTime }
        mergedTodos.push(newLocal)
        todosToUpdateLocally.push(newLocal)
      }
    } else if (local) {
      // Exists locally but not on remote
      if (!local.syncedAt) {
        // Never synced before: upload it
        const newSynced = { ...local, syncedAt: syncTime }
        mergedTodos.push(newSynced)
        todosToUpdateLocally.push(newSynced)
      } else {
        // Was previously synced, but now missing from remote (deleted on other client/Obsidian)
        todoIdsToDeleteLocally.push(local.id)
      }
    }
  }

  // Update local todos database
  if (todosToUpdateLocally.length > 0) {
    await db.todos.bulkPut(todosToUpdateLocally)
  }
  if (todoIdsToDeleteLocally.length > 0) {
    await db.todos.bulkDelete(todoIdsToDeleteLocally)
  }

  // Push merged tasks to GitHub
  const serializedTasks = serializeTodos(mergedTodos)
  await updateFileContent(pat, repo, tasksPath, serializedTasks, remoteTasksFile.sha)


  // --- PART 2: HABITS SYNC ---
  const localHabits = await db.habits.toArray()
  const localLogs = await db.habitLogs.toArray()

  const remoteHabitsFile = await getFileContent(pat, repo, habitsPath)
  const { logs: parsedRemoteLogs, newHabits: parsedNewHabits } = remoteHabitsFile.content
    ? parseHabits(remoteHabitsFile.content, localHabits)
    : { logs: [], newHabits: [] }

  // 1. Add any new habits created in Obsidian
  if (parsedNewHabits.length > 0) {
    await db.habits.bulkAdd(parsedNewHabits)
    localHabits.push(...parsedNewHabits)
  }

  // 2. Reconcile habit logs
  const localLogsMap = new Map(localLogs.map((l) => [`${l.habitId}_${l.date}`, l]))
  const remoteLogsMap = new Map(parsedRemoteLogs.map((l) => [`${l.habitId}_${l.date}`, l]))

  const allLogKeys = new Set([...localLogsMap.keys(), ...remoteLogsMap.keys()])
  const mergedLogs: HabitLog[] = []
  const logsToUpdateLocally: HabitLog[] = []
  const logIdsToDeleteLocally: string[] = []

  for (const key of allLogKeys) {
    const local = localLogsMap.get(key)
    const remote = remoteLogsMap.get(key)

    if (local && remote) {
      // Exists in both: keep it
      mergedLogs.push(local)
    } else if (remote) {
      // Exists on remote (Obsidian check-in) but not local
      mergedLogs.push(remote)
      logsToUpdateLocally.push(remote)
    } else if (local) {
      // Exists locally but not remote
      const lastSync = localStorage.getItem('tuntask_last_sync')
      if (lastSync) {
        // Was previously synced but deleted on other client: delete locally
        logIdsToDeleteLocally.push(local.id)
      } else {
        // Initial sync: upload it
        mergedLogs.push(local)
      }
    }
  }

  if (logsToUpdateLocally.length > 0) {
    await db.habitLogs.bulkPut(logsToUpdateLocally)
  }
  if (logIdsToDeleteLocally.length > 0) {
    await db.habitLogs.bulkDelete(logIdsToDeleteLocally)
  }

  // Push habits to GitHub
  const updatedLocalHabits = await db.habits.toArray()
  const serializedHabits = serializeHabits(updatedLocalHabits, mergedLogs)
  await updateFileContent(pat, repo, habitsPath, serializedHabits, remoteHabitsFile.sha)


  // --- PART 3: AUTO-CREATE HABIT NOTES IN 06 - Habits ---
  try {
    const habitFiles = await getDirectoryContents(pat, repo, '06 - Habits')
    const existingFileNames = new Set(habitFiles.map((f: any) => f.name.toLowerCase()))

    for (const habit of updatedLocalHabits) {
      const fileName = `${habit.title}.md`
      if (!existingFileNames.has(fileName.toLowerCase())) {
        const todayStr = new Date().toISOString().split('T')[0]
        const freqLabel = habit.schedule.kind === 'daily' ? 'daily' : 'weekly'

        const content = `---
type: habit
frequency: ${freqLabel}
created: ${todayStr}
tags:
---

# 🧘 Habit: ${habit.title}

\`\`\`dataviewjs
const style = "background-color: var(--background-modifier-border); color: var(--text-normal); padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-color); font-weight: 500; font-size: 0.9em; cursor: pointer; transition: background-color 0.2s ease, transform 0.1s ease; outline: none;";

const container = dv.el("div", "", {
    attr: { style: "display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;" }
});

const createButton = (label, commandId, activeStyle = "") => {
    const btn = document.createElement("button");
    btn.innerText = label;
    btn.style = style + activeStyle;
    btn.addEventListener("click", () => {
        app.commands.executeCommandById(commandId);
    });
    btn.addEventListener("mousedown", () => btn.style.transform = "scale(0.95)");
    btn.addEventListener("mouseup", () => btn.style.transform = "scale(1)");
    container.appendChild(btn);
};

createButton("📥 Archive Habit", "quickadd:choice:archive-active-note", "background-color: var(--interactive-accent); color: var(--text-on-accent); border: none; font-weight: 600;");
\`\`\`


> Frekuensi: ${freqLabel}
> Dilacak otomatis menggunakan tugas selesai di bawah.

\`\`\`contributionGraph
title: ${habit.title}
graphType: default
dateRangeValue: 365
dateRangeType: LATEST_DAYS
startOfWeek: 0
showCellRuleIndicators: true
titleStyle:
  textAlign: left
  fontSize: 15px
  fontWeight: normal
dataSource:
  type: TASK_IN_SPECIFIC_PAGE
  value: '"TunTask/habits.md"'
  dateField: {}
  filters:
    - id: "1780293636021"
      type: STATUS_IS
      value: COMPLETED
fillTheScreen: false
enableMainContainerShadow: false
cellStyleRules: []

\`\`\`

## Tasks

- [ ] 🌱 ${habit.title} 🔁 ${habit.schedule.kind === 'daily' ? 'every day' : 'every week'} 📅 ${todayStr}

## Notes

- [[Habit]]
`
        await updateFileContent(pat, repo, `06 - Habits/${fileName}`, content)
      }
    }
  } catch (err) {
    console.error('Failed to auto-create habit files on GitHub:', err)
  }
}
