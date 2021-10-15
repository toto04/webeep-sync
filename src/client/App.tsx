import React, { FC, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import './index.scss'

import { LoginContext } from './LoginContext'
import { MainView } from './views/MainView'
import { SettingsModal } from './views/Settings'
import { Course } from '../helpers/moodle'
import { CourseList } from './views/CourseList'

let App: FC = () => {
    let [setting, setSetting] = useState(false)

    let [isLogged, setLogged] = useState(false)
    let [username, setUser] = useState<string>('...')

    let [syncing, setSyncing] = useState(false)
    let [courses, setCourses] = useState<Course[]>()

    useEffect(() => {
        ipcRenderer.on('is-logged', (e, success: boolean, username?: string, exp?: boolean) => {
            setSetting(false)
            setLogged(success)
            if (success) ipcRenderer.send('courses')
        })
        ipcRenderer.send('get-logged')

        ipcRenderer.on('username', (e, username: string) => setUser(username))
        ipcRenderer.on('syncing', (e, sync: boolean) => setSyncing(sync))
        ipcRenderer.on('courses-return', (e, courses: Course[]) => setCourses(courses))
        ipcRenderer.send('courses')
    }, [])

    return <div className="App">
        <LoginContext.Provider value={{ isLogged, username, syncing }}>
            <div className="headbar">
                WeBeep Sync
            </div>
            <MainView onLogin={() => { ipcRenderer.send('request-login') }} onSettings={() => setSetting(true)} />
        </LoginContext.Provider>
        {setting ? <SettingsModal onClose={() => {
            setSetting(false)
        }} /> : undefined}
        {(isLogged && courses) ? <CourseList courses={courses} /> : undefined}
    </div>
}

ReactDOM.render(<App />, document.body)
