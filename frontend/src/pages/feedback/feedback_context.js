import { createContext, useContext } from 'react'

// Who is using the system.

export const ActorContext = createContext({ actor: null, setActor: () => {}, meta: null })

export const useActor = () => useContext(ActorContext)
