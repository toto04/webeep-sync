import React, { FC, useEffect, useState } from 'react'
import { ipcRenderer, IpcRendererEvent } from 'electron'
import { Modal } from '../components/Modal'

export let SettingsModal: FC<{ onClose: () => void }> = (props) => {

    return <Modal onClose={() => props.onClose()}>
        <div className="settings">
            <h3>settings</h3>
            <button className="danger-button" onClick={() => {
                ipcRenderer.send('logout')
            }}>log out</button>
            <div className="button-line-container">
                <button className="discard-button" onClick={() => props.onClose()}>annulla</button>
                <button className="confirm-button">ok</button>
            </div>
        </div>
    </Modal>
}