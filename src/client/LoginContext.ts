import React, { createContext } from 'react'

interface ILoginContext {
    isLogged: boolean
    username?: string
    syncing: boolean
}

export let LoginContext = createContext<ILoginContext>({
    isLogged: false,
    syncing: false
})