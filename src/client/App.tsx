import React, { FC, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import './index.scss'

import { LoginContext } from './LoginContext'
import { LoginModal } from './views/Login'
import { MainView } from './views/MainView'
import { SettingsModal } from './views/Settings'

let App: FC = () => {
    let [setting, setSetting] = useState(false)
    let [logging, setLogging] = useState(false)
    let [isLogged, setLogged] = useState(false)
    let [expiring, setExpiring] = useState(false)
    let [username, setUser] = useState<string>()

    useEffect(() => {
        ipcRenderer.on('refresh-credentials', () => ipcRenderer.send('credentials'))
        ipcRenderer.on('login-return', (e, success: boolean, username?: string) => {
            setSetting(false)
            setLogging(false)
            setLogged(success)
            setUser(username)
        })
        ipcRenderer.send('credentials')
    }, [])

    return <div className="App">
        <LoginContext.Provider value={{ isLogged, expiring, username }}>
            <div className="headbar">
                WeBeep Sync
            </div>
            <MainView onLogin={() => { setLogging(true) }} onSettings={() => setSetting(true)} />
        </LoginContext.Provider>
        {logging ? <LoginModal onClose={() => {
            setLogging(false)
        }} /> : undefined}
        {setting ? <SettingsModal onClose={() => {
            setSetting(false)
        }} /> : undefined}
    </div>
}

ReactDOM.render(<App />, document.body)
