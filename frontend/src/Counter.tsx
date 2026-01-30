import React, { useState } from "react"

import { useXSkill } from "@x-skills-for-ai/react"

export function Counter() {
    const [count, setCount] = useState(0)

    // Register increment skill
    useXSkill({
        id: "increment",
        description: "Increase counter",
        handler: async (params) => { setCount(c => c + (params?.by || 1)) }
    })

    // Register decrement skill
    useXSkill({
        id: "decrement",
        description: "Decrease counter",
        handler: async (params) => { setCount(c => c - (params?.by || 1)) }
    })

    return (
        <div className="counter-container">
            <h2 className="counter-title" data-testid="count">Counter: {count}</h2>
            {/* <div className="counter-buttons">
                <button className="counter-btn" onClick={() => setCount(c => c + 1)}>Increment</button>
                <button className="counter-btn" onClick={() => setCount(c => c - 1)}>Decrement</button>
            </div> */}
        </div>
    )
}