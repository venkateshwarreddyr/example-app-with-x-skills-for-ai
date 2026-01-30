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
    <li className="todo-item">
      <input
        className="todo-checkbox"
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        aria-label={`toggle-${todo.id}`}
      />
      <div className="todo-content">
        <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
          {todo.text}
        </span>
        {todo.tags?.length ? (
          <div className="todo-tags">
            {todo.tags.map(tag => (
              <span
                key={tag}
                className={`todo-tag ${tag}`}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  )
}
