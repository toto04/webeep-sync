import { ipcRenderer } from 'electron'
import { i18n } from 'i18next'
import React, { FC, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoSettingsSharp, IoWarning } from 'react-icons/io5'
import { LoginContext } from '../LoginContext'

let _i18n: i18n

function readableTime(lastSynced?: number): string {
    let t = _i18n.getFixedT(null, 'client', 'mainView.readableTime')
    if (!lastSynced) return t('never')
    let dt = (Date.now() - lastSynced) / 1000
    if (dt < 60) return t('now')
    dt = Math.floor(dt / 60)
    if (dt < 60)
        return t('minute', { count: dt })
    dt = Math.floor(dt / 60)
    if (dt < 24)
        return t('hour', { count: dt })
    dt = Math.floor(dt / 24)
    if (dt < 31)
        return t('day', { count: dt })
    return t('months')
}

export let MainView: FC<{ onLogin: () => void, onSettings: () => void }> = (props) => {
    let { isLogged, username, syncing, connected } = useContext(LoginContext)

    let [t, i18n] = useTranslation('client', { keyPrefix: 'mainView' })

    let [elapsedTime, setElapsedTime] = useState('...')

    useEffect(() => {
        _i18n = i18n
        let updateTime = async () => {
            let ls = await ipcRenderer.invoke('lastsynced')
            setElapsedTime(readableTime(ls))
        }
        setInterval(() => updateTime(), 60000)
        i18n.on('languageChanged', () => updateTime())
        ipcRenderer.on('syncing', () => updateTime())
        updateTime()
    }, [])

    return <div className="main-view section">
        <div className="last-synced">
            <span>{t('lastSynced')}</span>
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
                    ? t('stop')
                    : (isLogged ? t('sync') : t('loginToSync'))
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
                        {t('login')}
                    </a>
                }
            </div>
            <IoSettingsSharp className="clickable" onClick={() => props.onSettings()} />
        </div>
    </div>
}