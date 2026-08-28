import { createContext, useContext } from 'react'

// Who is working, and the reference data every page in the module needs.
//
// The context object and its hook live apart from the layout component that
// provides them, so the layout file exports a component and nothing else.

export const BudgetContext = createContext({ meta: null, actorId: '', setActor: () => {} })

export const useBudget = () => useContext(BudgetContext)
