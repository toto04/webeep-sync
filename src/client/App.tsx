import React, { FC, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import './index.scss'

import { LoginContext } from './LoginContext'
import { LoginModal } from './Login'
import { MainView } from './MainView'

let App: FC = () => {
    let [logging, setLogging] = useState(false)
    let [isLogged, setLogged] = useState(false)
    let [expiring, setExpiring] = useState(false)
    let [username, setUser] = useState<string>()

    useEffect(() => {
        ipcRenderer.on('login-return', (e, success: boolean) => {
            setLogging(false)
            setLogged(success)
        })
    }, [])

    return <div className="App">
        <LoginContext.Provider value={{ isLogged, expiring, username }}>
            <div className="headbar">
                WeBeep Sync
            </div>
            <MainView onLogin={() => { setLogging(true) }} />
        </LoginContext.Provider>
        {logging ? <LoginModal onClose={() => {
            setLogging(false)
        }} /> : undefined}
    </div>
}

ReactDOM.render(<App />, document.body)
