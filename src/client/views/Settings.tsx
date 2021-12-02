import React, { FC, useEffect, useState } from 'react'
import _Switch from 'react-switch'
import { IoClose, IoWarning } from 'react-icons/io5'
import { ipcRenderer, shell } from 'electron'
import { Modal } from '../components/Modal'

import { Settings } from '../../helpers/store'

const themes = ['light', 'dark', 'system'] as const
type Theme = typeof themes[number]

export let Switch: FC<{
    onChange: (v: boolean) => void
    checked: boolean
    onColor?: string
    offColor?: string
    disabled?: boolean
}> = props => {
    return <_Switch
        disabled={props.disabled}
        onChange={v => props.onChange(v)}
        onColor={props.onColor ?? '#40c8e0'}
        offColor={props.offColor}
        checkedIcon
        uncheckedIcon
        handleDiameter={16}
        height={22}
        width={40}
        checked={props.checked}
        className="switch"
    />
}

let Link: FC<{ href: string }> = props => {
    return <a onClick={e => {
        e.preventDefault()
        shell.openExternal(props.href)
    }}>
        {props.children}
    </a>
}

let prevTheme: Theme // the previous theme is stored in case the users cancel the settigns change
export let SettingsModal: FC<{ onClose: () => void }> = (props) => {
    let [settings, updateSettigns] = useState<Omit<Settings, 'autosyncEnabled' | 'downloadPath' | 'autosyncInterval'>>()

    let [theme, setTheme] = useState<Theme>('system')

    useEffect(() => {
        ipcRenderer.invoke('settings').then(s => updateSettigns(s))
        ipcRenderer.invoke('get-native-theme').then(t => {
            setTheme(t)
            prevTheme = t
        })
    }, [])

    return <Modal onClose={() => props.onClose()}>
        {settings ? <div className="settings">
            <h3>Settings</h3>
            <IoClose className="close clickable" onClick={() => { props.onClose() }} />
            <div className="setting-section">
                {theme ? <div className="setting">
                    <span>Color theme</span>
                    <select value={theme} onChange={e => {
                        let theme = e.target.value as Theme
                        ipcRenderer.send('set-native-theme', theme)
                        setTheme(theme)
                    }}>
                        <option value="system">use system</option>
                        <option value="light">light theme</option>
                        <option value="dark">dark theme</option>
                    </select>
                </div> : undefined}
                <div className="setting">
                    <span>Language</span>
                    <select>
                        <option value="it">Italiano</option>
                        <option value="en">English</option>
                    </select>
                </div>
            </div>
            <div className="setting-section">
                <div className="setting">
                    <span>Open app at login</span>
                    <Switch
                        onChange={v => updateSettigns({ ...settings, openAtLogin: v })}
                        checked={settings.openAtLogin}
                    />
                </div>
                <div className="setting">
                    <span>Keep open in background</span>
                    <Switch
                        onChange={v => updateSettigns({ ...settings, keepOpenInBackground: v })}
                        checked={settings.keepOpenInBackground}
                    />
                    <span className="desc">
                        keep the app running in background while all windows are closed, if autosync is
                        enabled, they will happen in background too
                    </span>
                </div>
                <div className={`setting ${settings.keepOpenInBackground ? '' : 'disabled'}`}>
                    <span>Show app in tray</span>
                    <Switch
                        disabled={!settings.keepOpenInBackground}
                        onChange={v => updateSettigns({ ...settings, trayIcon: v })}
                        checked={settings.keepOpenInBackground && settings.trayIcon}
                    />
                </div>
                {settings.keepOpenInBackground && !settings.trayIcon ? <div className="setting-warn">
                    <IoWarning />
                    <span>
                        With the tray disabled, you wont be able to tell if the app is running.
                        Once you close the window, you'll need to relaunch the app to open it again.
                        If you have autosyncs enabled, those will keep going in the background
                    </span>
                </div> : undefined}
            </div>
            <div className="setting-section">
                <div className="setting">
                    <span>Sync new courses</span>
                    <Switch
                        onChange={v => updateSettigns({ ...settings, syncNewCourses: v })}
                        checked={settings.syncNewCourses}
                    />
                    <span className="desc">
                        When new courses are found, automatically add them to the courses that will
                        be synced
                    </span>
                </div>
            </div>
            <button className="danger-button" onClick={() => {
                ipcRenderer.send('logout')
            }}>log out</button>

            <span className="credits">
                Developed by Tommaso Morganti • <Link href="https://github.com/toto04">GitHub</Link>
                <br />
                <Link href="https://github.com/toto04/webeep-sync">Source code</Link> •&nbsp;
                <Link href="https://github.com/toto04/webeep-sync/issues">Report a Bug</Link>
            </span>

            <div className="button-line-container">
                <button className="discard-button" onClick={() => {
                    if (prevTheme) ipcRenderer.send('set-native-theme', prevTheme)
                    props.onClose()
                }}>annulla</button>
                <button className="confirm-button" onClick={async () => {
                    await ipcRenderer.invoke('set-settings', settings)
                    props.onClose()
                }} >ok</button>
            </div>
        </div> : undefined}
    </Modal>
}