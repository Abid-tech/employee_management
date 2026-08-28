import { createContext, useContext } from 'react'

// Who is using the system.
//
// There is no login yet. Rather than pretend otherwise and log every approval as
// "system", the header makes you pick a person, and that choice travels with
// every write. It is the honest version of the trust layer for a prototype: the
// audit trail still names a human, and when authentication arrives this context
// is the only thing that has to change.

export const ActorContext = createContext({ actor: null, setActor: () => {}, meta: null })

export const useActor = () => useContext(ActorContext)
