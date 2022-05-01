import { createContext } from 'react'

interface ILoginContext {
    isLogged: boolean
    username?: string
    syncing: boolean
    connected: boolean
}

export const LoginContext = createContext<ILoginContext>({
    isLogged: false,
    syncing: false,
    connected: true
})