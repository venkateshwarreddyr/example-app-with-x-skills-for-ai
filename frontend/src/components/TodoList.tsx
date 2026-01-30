import React from "react"
import { Todo, TodoItem } from "./TodoItem"

type Props = {
  todos: Todo[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function TodoList({ todos, onToggle, onRemove }: Props) {
  if (todos.length === 0) {
    return <p className="no-todos">No todos yet</p>
  }
  return (
    <ul className="todo-list">
      {todos.map(t => (
        <TodoItem key={t.id} todo={t} onToggle={onToggle} onRemove={onRemove} />)
      )}
    </ul>
  )
}
