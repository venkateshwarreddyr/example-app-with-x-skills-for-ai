import React from "react"

export type Todo = {
  id: string
  text: string
  completed: boolean
}

type Props = {
  todo: Todo
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function TodoItem({ todo, onToggle, onRemove }: Props) {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        aria-label={`toggle-${todo.id}`}
      />
      <span style={{ textDecoration: todo.completed ? "line-through" : "none", flex: 1 }}>
        {todo.text}
      </span>
      <button onClick={() => onRemove(todo.id)} aria-label={`remove-${todo.id}`}>
        Remove
      </button>
    </li>
  )
}
