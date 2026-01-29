import React, { useState } from "react"

type Props = {
  onAdd: (text: string) => void
}

export function TodoInput({ onAdd }: Props) {
  const [text, setText] = useState("")

  const submit = () => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return
    onAdd(trimmed)
    setText("")
  }

  return (
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
  )
}
