import React, { FC, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import { IoClose, IoRemove, IoSquareOutline } from 'react-icons/io5'
import './index.scss'

import { LoginContext } from './LoginContext'
import { MainView } from './views/MainView'
import { SyncSettings } from './views/SyncSettings'
import { SettingsModal } from './views/Settings'
import { Course } from '../helpers/moodle'
import { CourseList } from './views/CourseList'
import { SyncProgress } from './views/SyncProgress'

let App: FC = () => {
    let [setting, setSetting] = useState(false)

    let [isLogged, setLogged] = useState(false)
    let [username, setUser] = useState<string>('...')
    let [syncing, setSyncing] = useState(false)
    let [connected, setConnected] = useState(true)

    let [courses, setCourses] = useState<Course[]>()

    useEffect(() => {
        ipcRenderer.on('is-logged', (e, success: boolean, username?: string, exp?: boolean) => {
            setSetting(false)
            setLogged(success)
            if (success) ipcRenderer.send('courses')
        })
        ipcRenderer.send('get-context')

        ipcRenderer.on('username', (e, username: string) => setUser(username))
        ipcRenderer.on('syncing', (e, sync: boolean) => setSyncing(sync))
        ipcRenderer.on('network_event', (e, conn: boolean) => setConnected(conn))
        ipcRenderer.on('courses-return', (e, courses: Course[]) => setCourses(courses))
        ipcRenderer.send('courses')
    }, [])

    return <div className="App">
        <LoginContext.Provider value={{ isLogged, username, syncing, connected }}>
            <div className="headbar">
                WeBeep Sync
                <div className="windows-control-buttons">
                    <button className="windows minimize" onClick={() => {
                        ipcRenderer.invoke('window-control', 'min')
                    }}>
                        <IoRemove />
                    </button>
                    <button className="windows maximize" onClick={() => {
                        ipcRenderer.invoke('window-control', 'max')
                    }}>
                        <IoSquareOutline />
                    </button>
                    <button className="windows close" onClick={() => {
                        ipcRenderer.invoke('window-control', 'close')
                    }}>
                        <IoClose />
                    </button>
                </div>
            </div>

            <MainView onLogin={() => { ipcRenderer.send('request-login') }} onSettings={() => setSetting(true)} />
            <SyncSettings />
            <SyncProgress />
            {(isLogged && courses) ? <CourseList courses={courses} /> : undefined}
            {setting ? <SettingsModal onClose={() => {
                setSetting(false)
            }} /> : undefined}
        </LoginContext.Provider>
    </div>
}

ReactDOM.render(<App />, document.body)
