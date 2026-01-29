import React from "react"
import { useXSkill } from "@x-skills-for-ai/react"

export type Todo = {
  id: string
  text: string
  completed: boolean
  tags: string[]
}

type Props = {
  todo: Todo
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function TodoItem({ todo, onToggle, onRemove }: Props) {
  useXSkill({
    id: "remove_todo_" + todo.id,
    description: `Remove todo item "${todo.text}"`,
    handler: async () => {
      onRemove(todo.id)
    },
  })

  useXSkill({
    id: "toggle_todo_" + todo.id,
    description: `Toggle todo item "${todo.text}"`,
    handler: async () => {
      onToggle(todo.id)
    },
  })

  return (
    <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        aria-label={`toggle-${todo.id}`}
      />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ textDecoration: todo.completed ? "line-through" : "none" }}>
          {todo.text}
        </span>
        {todo.tags?.length ? (
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {todo.tags.map(tag => (
              <span
                key={tag}
                style={{
                  fontSize: 12,
                  padding: "2px 6px",
                  background: "#eef2ff",
                  color: "#3730a3",
                  borderRadius: 12,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <button onClick={() => onRemove(todo.id)} aria-label={`remove-${todo.id}`}>
        Remove
      </button>
    </li>
  )
}
