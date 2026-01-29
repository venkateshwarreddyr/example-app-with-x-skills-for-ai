# React Counter Example

This is a full React app demonstrating the `@x-skills-for-ai/react` wrapper.

## Folder Structure

```
examples/react/react-counter/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ public/
│  └─ index.html
└─ src/
   ├─ index.tsx
   ├─ App.tsx
   └─ Counter.tsx
```

## Run Locally

1. Install dependencies at monorepo root:

```bash
cd xskills
npm install
```

2. Build packages:

```bash
npm run build:all
```

3. Run the dev server:

```bash
npm run dev:react-example
```

Or:

```bash
cd examples/react/react-counter
npm run dev
```

4. Open [http://localhost:5173/react-counter/](http://localhost:5173/react-counter/)

## Features

- Increment/Decrement counter with React state.
- `useXSkill` registers `increment` and `decrement` skills.
- Skills executable via buttons or browser console:

```js
window.__XSKILLS__.execute("increment")
window.__XSKILLS__.execute("decrement")
# example-app-with-x-skills-for-ai
