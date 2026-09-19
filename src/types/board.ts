export type WorkspaceSubtask = {
  id: string
  title: string
  isCompleted: boolean
  position: number
}

export type WorkspaceTask = {
  id: string
  title: string
  description: string
  position: number
  subtasks: WorkspaceSubtask[]
}

export type WorkspaceColumn = {
  id: string
  name: string
  color: string
  position: number
  tasks: WorkspaceTask[]
}

export type WorkspaceBoard = {
  id: string
  name: string
  ownerId: string
  columns: WorkspaceColumn[]
}