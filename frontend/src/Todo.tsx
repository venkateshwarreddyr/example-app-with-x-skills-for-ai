import React, { useMemo, useState } from "react"

import { useXSkill } from "@x-skills-for-ai/react"
import { TodoInput } from "./components/TodoInput"
import { TodoList } from "./components/TodoList"
import type { Todo } from "./components/TodoItem"

export function Todo() {
  const [todos, setTodos] = useState<Todo[]>([])

  const addTodo = (text: string, tags: string[] = []) => {
    const newTodo: Todo = {
      id: `${Date.now()}`,
      text,
      completed: false,
      tags,
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
    <div className="todo-container">
      <h2 className="todo-title">Todo</h2>
      <TodoInput onAdd={addTodo} />



      <p className="todo-total">Total: {todos.length}</p>
      <div className="todo-scroll-container">
               <TodoList todos={todos} onToggle={toggleTodo} onRemove={removeTodo} />
           </div>
    </div>
  )
}

