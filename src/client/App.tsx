import React, { FC, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import './index.scss'

import { LoginContext } from './LoginContext'
import { LoginModal } from './views/Login'
import { MainView } from './views/MainView'
import { SettingsModal } from './views/Settings'
import { Course } from '../moodle'
import { CourseList } from './views/CourseList'

let App: FC = () => {
    let [setting, setSetting] = useState(false)
    let [logging, setLogging] = useState(false)

    let [isLogged, setLogged] = useState(false)
    let [expiring, setExpiring] = useState(false)
    let [username, setUser] = useState<string>()

    let [courses, setCourses] = useState<Course[]>()

    useEffect(() => {
        ipcRenderer.on('refresh-credentials', () => ipcRenderer.send('credentials'))
        ipcRenderer.on('login-return', (e, success: boolean, username?: string, exp?: boolean) => {
            setSetting(false)
            setLogging(false)
            setLogged(success)
            setUser(username)
            setExpiring(exp)
        })
        ipcRenderer.send('credentials')

        ipcRenderer.on('courses-return', (e, courses: Course[]) => {
            setCourses(courses)
        })
        ipcRenderer.send('courses')
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
        {courses ? <CourseList courses={courses} /> : undefined}
    </div>
}

ReactDOM.render(<App />, document.body)
