import { createContext, useContext } from 'react'

// Who is working, and the reference data every page in the module needs.

export const BudgetContext = createContext({ meta: null, actorId: '', setActor: () => {} })

export const useBudget = () => useContext(BudgetContext)
