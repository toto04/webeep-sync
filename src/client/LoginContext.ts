import React, { createContext } from 'react'

interface ILoginContext {
    isLogged: boolean
    expiring: boolean
    username?: string
}

export let LoginContext = createContext<ILoginContext>({
    isLogged: false,
    expiring: false
})