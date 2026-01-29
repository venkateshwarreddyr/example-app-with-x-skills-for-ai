import React, { useReducer } from 'react';

// 1. Define action types to avoid typos
const ACTIONS = {
  INCREMENT: 'INCREMENT',
  DECREMENT: 'DECREMENT',
  RESET: 'RESET'
} as const;

// 1. Define the shape of your state
interface CounterState {
  count: number;
}

// 2. Define action types using a Discriminated Union
// This ensures that "reset" doesn't require a payload, while others might.
type CounterAction =
  | { type: typeof ACTIONS.INCREMENT; payload: number }
  | { type: typeof ACTIONS.DECREMENT; payload: number }
  | { type: typeof ACTIONS.RESET };

const initialState: CounterState = { count: 0 };

// 3. The reducer with explicit types for state and action
function reducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case ACTIONS.INCREMENT:
      return { count: state.count + action.payload };
    case ACTIONS.DECREMENT:
      return { count: state.count - action.payload };
    case ACTIONS.RESET:
      return initialState;
    default:
      // Exhaustive check for TypeScript
      return state;
  }
}

export default function Counter() {
  // TypeScript infers the types from the reducer function
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Count: {state.count}</h2>
      
      {/* Type-safe dispatching */}
      <button onClick={() => dispatch({ type: 'INCREMENT', payload: 1 })}>
        +1
      </button>
      <button onClick={() => dispatch({ type: 'DECREMENT', payload: 1 })}>
        -1
      </button>
      <button onClick={() => dispatch({ type: 'RESET' })}>
        Reset
      </button>
    </div>
  );
}
