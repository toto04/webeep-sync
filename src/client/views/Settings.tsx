import { ipcRenderer } from 'electron'
import { platform, arch } from 'os'
import React, { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoWarning } from 'react-icons/io5'
import _Switch from 'react-switch'
import { Settings } from '../../modules/store'
import { Modal } from '../components/Modal'
import { Link } from '../components/Link'

let downloadLink = ''
switch (platform()) {
    case 'win32':
        downloadLink = 'https://github.com/toto04/webeep-sync/releases/latest/download/WeBeep.Sync.Windows.Setup.zip'
        break;
    case 'darwin':
        downloadLink = `https://github.com/toto04/webeep-sync/releases/latest/download/WeBeep.Sync.macOS-${arch()}.dmg`
        break;
    default:
        downloadLink = 'https://github.com/toto04/webeep-sync/releases/latest/'
        break;
}

const themes = ['light', 'dark', 'system'] as const
type Theme = typeof themes[number]

export const Switch: FC<{
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

const Link: FC<{
    href: string
    className?: string
    children: React.ReactNode
}> = props => {
    return <a onClick={e => {
        e.preventDefault()
        shell.openExternal(props.href)
    }} className={props.className}>
        {props.children}
    </a>
}

let prevTheme: Theme // the previous theme is stored in case the users cancel the settigns change
export const SettingsModal: FC<{ onClose: () => void }> = (props) => {
    const { t } = useTranslation('client', { keyPrefix: 'settings' })

    const [settings, updateSettigns] = useState<Omit<Settings, 'autosyncEnabled' | 'downloadPath' | 'autosyncInterval'>>()
    const [theme, setTheme] = useState<Theme>('system')
    const [version, setVersion] = useState('')
    const [newUpdate, setNewUpdate] = useState<string | null>(null)

    useEffect(() => {
        ipcRenderer.invoke('settings').then(s => updateSettigns(s))
        ipcRenderer.invoke('get-native-theme').then(t => {
            setTheme(t)
            prevTheme = t
        })
        ipcRenderer.invoke('version').then(v => setVersion(v))
        ipcRenderer.invoke('get-available-update').then(update => setNewUpdate(update))
    }, [])

    return <Modal title={t('settings')} onClose={() => props.onClose()}>
        {settings ? <div className="settings">

            {newUpdate !== null ? <div className="setting-section update">
                <h3>{t('newUpdateAvailable')}</h3>
                <span>v{newUpdate} • <Link href='https://github.com/toto04/webeep-sync/releases/latest'>changelog</Link></span>
                <Link className="confirm-button" href={downloadLink}>download</Link>
                <a className='ignore' onClick={async () => {
                    await ipcRenderer.invoke('ignore-update', newUpdate)
                    setNewUpdate(await ipcRenderer.invoke('get-available-update'))
                }}>{t('ignoreUpdate')}</a>
            </div> : undefined}


            <div className="setting-section">
                {theme ? <div className="setting">
                    <span>{t('colorTheme')}</span>
                    <select value={theme} onChange={e => {
                        const theme = e.target.value as Theme
                        ipcRenderer.send('set-native-theme', theme)
                        setTheme(theme)
                        updateSettigns({ ...settings, nativeThemeSource: theme })
                    }}>
                        <option value="system">{t('theme.system')}</option>
                        <option value="light">{t('theme.light')}</option>
                        <option value="dark">{t('theme.dark')}</option>
                    </select>
                </div> : undefined}

                <div className="setting">
                    <span>{t('language')}</span>
                    <select value={settings.language} onChange={e => {
                        const language = e.target.value as 'it' | 'en'
                        updateSettigns({ ...settings, language })
                    }}>
                        <option value="it">Italiano</option>
                        <option value="en">English</option>
                    </select>
                </div>
            </div>


            <div className="setting-section">
                <div className="setting">
                    <span>{t('notifyUpdate')}</span>
                    <Switch
                        onChange={v => updateSettigns({ ...settings, checkForUpdates: v })}
                        checked={settings.checkForUpdates}
                    />
                    <span className="desc">{t('notifyUpdate_desc')}</span>
                </div>

                <div className="setting">
                    <span>{t('openAtLogin')}</span>
                    <Switch
                        onChange={v => updateSettigns({ ...settings, openAtLogin: v })}
                        checked={settings.openAtLogin}
                    />
                </div>

                <div className="setting">
                    <span>{t('keepOpenInBackground')}</span>
                    <Switch
                        onChange={v => updateSettigns({ ...settings, keepOpenInBackground: v })}
                        checked={settings.keepOpenInBackground}
                    />
                    <span className="desc">{t('keepOpenInBackground_desc')}</span>
                </div>

                <div className={`setting ${settings.keepOpenInBackground ? '' : 'disabled'}`}>
                    <span>{t('showInTray')}</span>
                    <Switch
                        disabled={!settings.keepOpenInBackground}
                        onChange={v => updateSettigns({ ...settings, trayIcon: v })}
                        checked={settings.keepOpenInBackground && settings.trayIcon}
                    />
                </div>

                {settings.keepOpenInBackground && !settings.trayIcon ? <div className="setting-warn">
                    <IoWarning />
                    <span>{t('trayWarning')}</span>
                </div> : undefined}

                <div className={`setting ${settings.keepOpenInBackground ? '' : 'disabled'}`}>
                    <span>{t('notifications')}</span>
                    <Switch
                        disabled={!settings.keepOpenInBackground}
                        onChange={v => updateSettigns({ ...settings, notificationOnNewFiles: v })}
                        checked={settings.keepOpenInBackground && settings.notificationOnNewFiles}
                    />
                </div>

            </div>


            <div className="setting-section">
                <div className="setting">
                    <span>{t('newCourses')}</span>
                    <Switch
                        onChange={v => updateSettigns({ ...settings, syncNewCourses: v })}
                        checked={settings.syncNewCourses}
                    />
                    <span className="desc">{t('newCourses_desc')}</span>
                </div>
                <div className="setting">
                    <span>{t('concurrentDownloads')}</span>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={settings.maxConcurrentDownloads}
                        onChange={e => {
                            let maxConcurrentDownloads = parseInt(e.target.value)
                            if (maxConcurrentDownloads > 100) maxConcurrentDownloads = 100
                            updateSettigns({ ...settings, maxConcurrentDownloads })
                        }}
                    />
                    <span className="desc">{t('concurrentDownloads_desc')}</span>
                </div>
            </div>

            <button className="danger-button" onClick={() => {
                ipcRenderer.send('logout')
            }}>{t('logout')}</button>

            <span className="credits">
                <span>v{version}</span>
                <br />
                Developed by Tommaso Morganti • <Link href="https://github.com/toto04">GitHub</Link>
                <br />
                <Link href="https://github.com/toto04/webeep-sync">Source code</Link> •&nbsp;
                <Link href="https://github.com/toto04/webeep-sync/issues">Report a Bug</Link>
            </span>

            <div className="button-line-container">
                <button className="discard-button" onClick={() => {
                    if (prevTheme) ipcRenderer.send('set-native-theme', prevTheme)
                    props.onClose()
                }}>{t('cancel')}</button>
                <button className="confirm-button" onClick={async () => {
                    await ipcRenderer.invoke('set-settings', settings)
                    props.onClose()
                }}>{t('ok')}</button>
            </div>
        </div> : undefined}
    </Modal>
}