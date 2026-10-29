import '@testing-library/jest-dom/vitest'

// Tests never open a Realtime connection.
vi.mock('../data/realtime', () => ({ subscribeToHousehold: () => () => {} }))
