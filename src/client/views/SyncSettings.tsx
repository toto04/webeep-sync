import React, { FC, useEffect, useState } from 'react'
import { IoFolderOpen, IoPencil } from 'react-icons/io5'
import { shell } from 'electron'
import { ipcRenderer } from 'electron'
import { Switch } from './Settings'
import { useTranslation } from 'react-i18next'

const hour = 60 * 60 * 1000

export let SyncSettings: FC = props => {

    let [path, setPath] = useState('...')
    let [autosync, setAutosync] = useState(false)
    let [syncInterval, setSyncInterval] = useState(0)

    let { t } = useTranslation('client', { keyPrefix: 'syncSettings' })

    useEffect(() => {
        ipcRenderer.on('download-path', (e, path: string) => setPath(path))
        ipcRenderer.on('autosync', (e, sync: boolean) => setAutosync(sync))
        ipcRenderer.on('autosync-interval', (e, interval: number) => setSyncInterval(interval))

        ipcRenderer.send('sync-settings')
    }, [])

    return <div className="sync-settings section">
        <div className="download-path section">
            <div style={{ flex: 1 }}>
                <h3>{t('downloadFolder')}</h3>
                <span className="path">{path.replace(/\\/g, '\\\u200B').replace(/\//g, '/\u200B')}</span>
            </div>
            <div className="clickable" onClick={() => {
                shell.openPath(path)
            }}>
                <IoFolderOpen />
                <span>{t('open')}</span>
            </div>
            <div className="clickable" onClick={() => {
                ipcRenderer.send('select-download-path')
            }} >
                <IoPencil />
                <span>{t('edit')}</span>
            </div>
        </div>
        <div className="autosync section">
            <div className="autosync-row">
                <h3>Autosync</h3>
                <Switch
                    onChange={v => ipcRenderer.send('set-autosync', v)}
                    checked={autosync}
                    onColor="#34c759"
                    offColor="#ff3b30"
                />
            </div>
            <div className={"autosync-row" + (autosync ? '' : ' disabled')}>
                <span>{t('syncEvery')} </span>
                <select disabled={!autosync} value={autosync ? syncInterval / hour : 0} onChange={e => {
                    ipcRenderer.send('set-autosync-interval', parseInt(e.target.value) * hour)
                }}>
                    <option value={0} disabled >---</option>
                    <option value={1}>{t('ai.hour', { count: 1 })}</option>
                    <option value={2}>{t('ai.hour', { count: 2 })}</option>
                    <option value={8}>{t('ai.hour', { count: 8 })}</option>
                    <option value={12}>{t('ai.hour', { count: 12 })}</option>
                    <option value={24}>{t('ai.day', { count: 1 })}</option>
                    <option value={48}>{t('ai.day', { count: 2 })}</option>
                    <option value={168}>{t('ai.week')}</option>
                </select>
            </div>
        </div>
    </div>
}