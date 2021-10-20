import React, { FC, useEffect, useState } from 'react'
import { ipcRenderer, IpcRendererEvent } from 'electron'
import { Modal } from '../components/Modal'
import { Checkbox } from '../components/Checkbox'

import { Settings } from '../../helpers/store'
import { IoBag, IoCheckbox, IoSquareOutline } from 'react-icons/io5'

const hour = 60 * 60 * 1000

export let SettingsModal: FC<{ onClose: () => void }> = (props) => {
    let [settings, updateSettigns] = useState<Omit<Settings, 'autosyncEnabled' | 'downloadPath'>>()

    useEffect(() => {
        ipcRenderer.invoke('settings').then(s => updateSettigns(s))
    }, [])

    return <Modal onClose={() => props.onClose()}>
        {settings ? <div className="settings">
            <h3>settings</h3>
            <div className="setting">
                <span>Autosync interval</span>
                <select defaultValue={settings.autosyncInterval / hour} onChange={e => {
                    updateSettigns({ ...settings, autosyncInterval: parseInt(e.target.value) * hour })
                }}>
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={8}>8 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>1 day</option>
                    <option value={48}>2 days</option>
                    <option value={168}>1 week</option>
                </select>
            </div>
            <div className="setting">
                <span>Sync new courses when they are found</span>
                <Checkbox
                    onChange={v => { updateSettigns({ ...settings, syncNewCourses: v }) }}
                    PositiveIcon={IoCheckbox}
                    NegativeIcon={IoSquareOutline}
                    value={settings.syncNewCourses}
                />
            </div>
            <button className="danger-button" onClick={() => {
                ipcRenderer.send('logout')
            }}>log out</button>
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