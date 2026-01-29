import React, { useState } from "react"
import Select, { type MultiValue } from "react-select"

type Props = {
  onAdd: (text: string, tags: string[]) => void
}

export function TodoInput({ onAdd }: Props) {
  const [text, setText] = useState("")
  type Option = { value: string; label: string }
  const [selected, setSelected] = useState<Option[]>([])

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

  const submit = () => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return
    onAdd(trimmed, selected.map(s => s.value))
    setText("")
    setSelected([])
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
      <Select
        isMulti
        options={tagOptions}
        value={selected}
        onChange={(vals: MultiValue<Option>) => setSelected(vals as Option[])}
        placeholder="Add tags... (e.g. Work, Urgent)"
        aria-label="todo-tags"
      />
    </div>
  )
}
