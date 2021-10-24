import React, { createContext } from 'react'

interface ILoginContext {
    isLogged: boolean
    username?: string
    syncing: boolean
    connected: boolean
}

export let LoginContext = createContext<ILoginContext>({
    isLogged: false,
    syncing: false,
    connected: true
})