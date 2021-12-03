import { ipcRenderer } from 'electron'
import React, { FC, useContext, useEffect, useState } from 'react'
import { IoSettingsSharp, IoWarning } from 'react-icons/io5'
import { LoginContext } from '../LoginContext'

function readableTime(lastSynced?: number): string {
    if (!lastSynced) return 'never'
    let dt = (Date.now() - lastSynced) / 1000
    if (dt < 60) return 'right now'
    dt = Math.floor(dt / 60)
    if (dt < 60)
        return `${dt} ${dt === 1 ? 'minute' : 'minutes'} ago`
    dt = Math.floor(dt / 60)
    if (dt < 24)
        return `${dt} ${dt === 1 ? 'hour' : 'hours'} ago`
    dt = Math.floor(dt / 24)
    if (dt < 31)
        return dt === 1 ? 'yesterday' : (dt + ' days ago')
    return 'months ago +'
}

export let MainView: FC<{ onLogin: () => void, onSettings: () => void }> = (props) => {
    let { isLogged, username, syncing, connected } = useContext(LoginContext)


    let [elapsedTime, setElapsedTime] = useState('...')

    useEffect(() => {
        let updateTime = async () => {
            let ls = await ipcRenderer.invoke('lastsynced')
            setElapsedTime(readableTime(ls))
        }
        setInterval(() => updateTime(), 60000)
        ipcRenderer.on('syncing', () => updateTime())
        updateTime()
    }, [])

    return <div className="main-view section">
        <div className="last-synced">
            <span>last synced</span>
            <h1>{elapsedTime}</h1>
        </div>
        <button
            className={"sync-now " + (syncing ? 'discard-button' : 'confirm-button')}
            onClick={() => {
                if (isLogged) ipcRenderer.send(syncing ? 'sync-stop' : 'sync-start')
                else props.onLogin()
            }}
        >
            <span>
                {syncing
                    ? 'stop'
                    : (isLogged ? 'sync now' : 'login to sync')
                }
            </span>
        </button>
        <div className="user-status">
            <div className="login-info">
                {connected ? undefined : <IoWarning className="warning" title="not connected" />}
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