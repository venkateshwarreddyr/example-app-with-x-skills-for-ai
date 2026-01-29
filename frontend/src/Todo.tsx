import React, { useMemo, useState } from "react"

import { useXSkill } from "@x-skills-for-ai/react"
import { TodoInput } from "./components/TodoInput"
import { TodoList } from "./components/TodoList"
import type { Todo } from "./components/TodoItem"

export function Todo() {
  const [todos, setTodos] = useState<Todo[]>([])

  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: `${Date.now()}`,
      text,
      completed: false,
    }
    setTodos(prev => [newTodo, ...prev])
  }

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  const removeTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const lastTodoId = useMemo(() => (todos.length ? todos[0].id : undefined), [todos])

  useXSkill({
    id: "add_todo",
    description: "Add a new todo item",
    handler: async () => {
      addTodo("New todo")
    },
  })

  useXSkill({
    id: "toggle_last_todo",
    description: "Toggle the most recently added todo",
    handler: async () => {
      if (lastTodoId) toggleTodo(lastTodoId)
    },
  })

  useXSkill({
    id: "remove_last_todo",
    description: "Remove the most recently added todo",
    handler: async () => {
      if (lastTodoId) removeTodo(lastTodoId)
    },
  })

  return (
    <div>
      <h2>Todo</h2>
      <TodoInput onAdd={addTodo} />

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => addTodo("New todo")}>Add sample</button>
        <button onClick={() => lastTodoId && toggleTodo(lastTodoId)} disabled={!lastTodoId}>
          Toggle last
        </button>
        <button onClick={() => lastTodoId && removeTodo(lastTodoId)} disabled={!lastTodoId}>
          Remove last
        </button>
      </div>

      <p style={{ marginTop: 12 }}>Total: {todos.length}</p>
      <TodoList todos={todos} onToggle={toggleTodo} onRemove={removeTodo} />
    </div>
  )
}

