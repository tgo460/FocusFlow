# FocusFlow

FocusFlow is a lightweight productivity component that supports:

- Daily task tracking
- Habit streak tracking
- Category management
- Persistent storage (window.storage with localStorage fallback)
- Task history view for previous dates

## Notes

- The main component file is `FocusFlow.jsx`.
- Data is persisted using the keys:
  - `focusflow:tasks`
  - `focusflow:categories`
  - `focusflow:streaks`
