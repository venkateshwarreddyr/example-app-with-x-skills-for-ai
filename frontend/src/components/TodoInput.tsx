import React, { useState } from "react"
import { useXSkill } from "@x-skills-for-ai/react"


type Props = {
  onAdd: (text: string, tags: string[]) => void

}

export function TodoInput({ onAdd }: Props) {
  const [text, setText] = useState("")
  const [select, setSelect] = useState("")

  const tagOptions = [
    { value: "work", label: "Work" },
    { value: "personal", label: "Personal" },
    { value: "urgent", label: "Urgent" },
    { value: "low", label: "Low Priority" },
    { value: "home", label: "Home" },
    { value: "shopping", label: "Shopping" },
    { value: "chores", label: "Chores" },
    { value: "followup", label: "Follow-up" },
    { value: "meeting", label: "Meeting" },
    { value: "research", label: "Research" },

  ]

  useXSkill({
    id: "add_tag",
    description: "Add or change tag. Available tags: " + tagOptions.map(option => option.value).join(", "),
    handler: async (params?: { tag: string }) => {
      const tag = params?.tag
      if (tag) {
        setSelect(tag)

      }
    },
  })

  useXSkill({
    id: "remove_tag",
    description: "Remove a todo item with tags: " + select,
    handler: async (params?: { tag: string }) => {
      const tagToRemove = params?.tag
      if (tagToRemove && tagToRemove === select) {
        setSelect("")

      }
    },
  })

  useXSkill({
    id: "add_todo",
    description: "Add a new todo item",
    handler: async ({ text }: { text: string }) => {
      onAdd(text, select ? [select] : [])
      setSelect("")
    },
  })

  const submit = () => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return
    onAdd(trimmed, select ? [select] : [])
    setText("")
    setSelect("")

  }

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelect(e.target.value)

  }

  return (
    <div className="todo-input-container">
      <div className="todo-input-row">
        <h5 className="todo-placeholder">{text ? text : "Add a todo"}</h5>
      </div>
      <div className="todo-tag-row">
        <h5 className="todo-placeholder">{select ? select : "Select a tag"}</h5>
      </div>
    </div>
  )
}
