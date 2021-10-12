import React, { createContext } from 'react'

interface ILoginContext {
    isLogged: boolean
    username?: string
}

export let LoginContext = createContext<ILoginContext>({
    isLogged: false,
})