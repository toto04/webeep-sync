import React, { FC, useEffect, useState } from 'react'
import _Switch from 'react-switch'
import { ipcRenderer } from 'electron'
import { Modal } from '../components/Modal'

import { Settings } from '../../helpers/store'

const themes = ['light', 'dark', 'system'] as const
type Theme = typeof themes[number]

export let Switch: FC<{
    onChange: (v: boolean) => void
    checked: boolean
    onColor?: string
    offColor?: string
}> = props => {
    return <_Switch
        onChange={v => props.onChange(v)}
        onColor={props.onColor ?? '#40c8e0'}
        offColor={props.offColor}
        checkedIcon
        uncheckedIcon
        handleDiameter={16}
        height={22}
        width={40}
        checked={props.checked}
    />
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
            <h3>settings</h3>
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
                <span>Sync new courses when they are found</span>
                <Switch
                    onChange={v => { updateSettigns({ ...settings, syncNewCourses: v }) }}
                    checked={settings.syncNewCourses}
                />
            </div>
            <button className="danger-button" onClick={() => {
                ipcRenderer.send('logout')
            }}>log out</button>

            {/* <span className="credits">
                Developed by Tommaso Morganti • <a href="https://github.com/toto04">GitHub</a>
                <br />
                <a href="https://github.com/toto04/webeep-sync">Source code</a> •
                <a href="https://github.com/toto04/webeep-sync/issues"> Report a Bug</a>
            </span> */}

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