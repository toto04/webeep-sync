import { ipcRenderer } from 'electron'
import React, { FC, useContext } from 'react'
import { IoSettingsSharp, IoWarning } from 'react-icons/io5'
import { LoginContext } from '../LoginContext'

export let MainView: FC<{ onLogin: () => void, onSettings: () => void }> = (props) => {
    let { isLogged, username, syncing } = useContext(LoginContext)
    return <div className="main-view">
        <div className="sync-status">
            {/* <IoTime /> */}
            <span>last synced</span>
            <h1>1 minute ago</h1>
        </div>
        <button
            className={"sync-now " + (syncing ? 'danger-button' : 'confirm-button')}
            onClick={() => {
                ipcRenderer.send(syncing ? 'sync-stop' : 'sync-start')
            }}
        >
            sync<br /> now
        </button>
        <div className="user-status">
            <div className="login-info">
                {isLogged
                    ? <span>
                        {username}
                    </span>
                    : <a className="text-button" onClick={() => props.onLogin()}>
                        Accedi...
                    </a>
                }
            </div>
            <IoSettingsSharp className="clickable" onClick={() => props.onSettings()} />
        </div>
    </div>
}