import React, { FC, useEffect, useState, Suspense } from 'react'
import { platform } from 'os'
import ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import { IoCloseOutline, IoRemoveOutline, IoSquareOutline } from 'react-icons/io5'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'

import './index.scss'

import { LoginContext } from './LoginContext'
import { MainView } from './views/MainView'
import { SyncSettings } from './views/SyncSettings'
import { SettingsModal } from './views/Settings'
import { Course } from '../modules/moodle'
import { CourseList } from './views/CourseList'
import { SyncProgress } from './views/SyncProgress'

const shouldDisplayWindowsControls = platform() === 'win32'

i18next.use(initReactI18next).init({ fallbackLng: 'en' })

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
        })
        ipcRenderer.send('get-context')

        ipcRenderer.on('username', (e, username: string) => setUser(username))
        ipcRenderer.on('syncing', (e, sync: boolean) => setSyncing(sync))
        ipcRenderer.on('network_event', (e, conn: boolean) => setConnected(conn))
        ipcRenderer.on('courses', (e, courses: Course[]) => setCourses(courses))
        ipcRenderer.on('language', async (e, p: { lng: string, bundle: any }) => {
            if (!i18next.hasResourceBundle(p.lng, 'client'))
                i18next.addResourceBundle(p.lng, 'client', p.bundle)
            await i18next.changeLanguage(p.lng)
        })
    }, [])

    return <Suspense fallback={<div>
        loading resources
    </div>}>
        <I18nextProvider i18n={i18next}>
            <LoginContext.Provider value={{ isLogged, username, syncing, connected }}>
                <div className="headbar">
                    WeBeep Sync
                    {shouldDisplayWindowsControls
                        ? <div className="windows-control-buttons">
                            <div className="windows minimize" onClick={() => {
                                ipcRenderer.invoke('window-control', 'min')
                            }}>
                                <IoRemoveOutline />
                            </div>
                            <div className="windows maximize" onClick={() => {
                                ipcRenderer.invoke('window-control', 'max')
                            }}>
                                <IoSquareOutline style={{ width: 12 }} />
                            </div>
                            <div className="windows close" onClick={() => {
                                ipcRenderer.invoke('window-control', 'close')
                            }}>
                                <IoCloseOutline />
                            </div>
                        </div>
                        : undefined
                    }
                </div>

                <MainView onLogin={() => { ipcRenderer.send('request-login') }} onSettings={() => setSetting(true)} />
                <SyncSettings />
                <SyncProgress />
                {(isLogged && courses) ? <CourseList courses={courses} /> : undefined}
                {setting ? <SettingsModal onClose={() => {
                    setSetting(false)
                }} /> : undefined}
            </LoginContext.Provider>
        </I18nextProvider>
    </Suspense>
}

ReactDOM.render(<App />, document.querySelector('.App'))
