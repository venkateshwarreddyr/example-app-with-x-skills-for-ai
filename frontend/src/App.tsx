import React from "react"
import { Counter } from "./Counter"
import Chat from "./chat/Chat"
import { Todo } from "./Todo"
import { useXSkill } from "@x-skills-for-ai/react"
import Realtime from "./chat/Realtime"

interface AppSkillParams {
  tab: "counter" | "todo"
}

export function App() {
  const [activeTab, setActiveTab] = React.useState<"counter" | "todo">("counter")

  useXSkill({
    id: "switch_app",
    handler: async ({ tab }: AppSkillParams) => {
      // TODO: Implement app handler
      setActiveTab(tab)
    },
    description: "Switch between counter and todo apps, tab: 'counter' | 'todo'",
  })

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 1, overflow: "auto", padding: "24px", textAlign: "center" }}>
        {activeTab === "counter" && (
          <>
            <h1>Counter Example</h1>
            <h1></h1>
            <Counter />
          </>
        )}
        {activeTab === "todo" && (
          <>
            <h1>Todo Example</h1>
            <Todo />
          </>
        )}
      </div>
      <div className="chat" style={{ width: "380px", borderLeft: "1px solid #eee" }}>
        <Realtime />
        {/* <Chat /> */}
      </div>
    </div>
  )
}