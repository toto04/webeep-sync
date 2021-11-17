import React, { FC, useEffect, useState } from 'react'
import _Switch from 'react-switch'
import { ipcRenderer } from 'electron'
import { Modal } from '../components/Modal'

import { Settings } from '../../helpers/store'

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

export let SettingsModal: FC<{ onClose: () => void }> = (props) => {
    let [settings, updateSettigns] = useState<Omit<Settings, 'autosyncEnabled' | 'downloadPath' | 'autosyncInterval'>>()

    useEffect(() => {
        ipcRenderer.invoke('settings').then(s => updateSettigns(s))
    }, [])

    return <Modal onClose={() => props.onClose()}>
        {settings ? <div className="settings">
            <h3>settings</h3>
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
                <button className="discard-button" onClick={() => props.onClose()}>annulla</button>
                <button className="confirm-button" onClick={async () => {
                    await ipcRenderer.invoke('set-settings', settings)
                    props.onClose()
                }} >ok</button>
            </div>
        </div> : undefined}
    </Modal>
}