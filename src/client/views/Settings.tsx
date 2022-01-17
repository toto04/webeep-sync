import { ipcRenderer, shell } from 'electron'
import { platform } from 'os'
import React, { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoWarning } from 'react-icons/io5'
import _Switch from 'react-switch'
import { Settings } from '../../helpers/store'
import { Modal } from '../components/Modal'


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
    let { t } = useTranslation('client', { keyPrefix: 'settings' })

    let [settings, updateSettigns] = useState<Omit<Settings, 'autosyncEnabled' | 'downloadPath' | 'autosyncInterval'>>()
    let [theme, setTheme] = useState<Theme>('system')
    let [version, setVersion] = useState('')

    useEffect(() => {
        ipcRenderer.invoke('settings').then(s => updateSettigns(s))
        ipcRenderer.invoke('get-native-theme').then(t => {
            setTheme(t)
            prevTheme = t
        })
        ipcRenderer.invoke('version').then(v => setVersion(v))
    }, [])

    return <Modal title={t('settings')} onClose={() => props.onClose()}>
        {settings ? <div className="settings">
            <div className="setting-section">
                {theme ? <div className="setting">
                    <span>{t('colorTheme')}</span>
                    <select value={theme} onChange={e => {
                        let theme = e.target.value as Theme
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
                        let language = e.target.value as 'it' | 'en'
                        updateSettigns({ ...settings, language })
                    }}>
                        <option value="it">Italiano</option>
                        <option value="en">English</option>
                    </select>
                </div>
            </div>
            <div className="setting-section">
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