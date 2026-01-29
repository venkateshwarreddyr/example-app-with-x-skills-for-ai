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
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a todo"
          onKeyDown={e => { if (e.key === "Enter") submit() }}
          style={{ flex: 1 }}
        />
        <button onClick={submit}>Add</button>
      </div>
      <div>

        <select
          value={select}
          onChange={handleTagChange}
          aria-label="todo-tags"
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px"

          }}
        >
          <option value="">Select a tag</option>
          {tagOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>

          ))}
        </select>
      </div>
    </div>
  )
}
