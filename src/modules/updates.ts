import { EventEmitter } from 'events'

import { app } from 'electron'
import got from 'got'
import { store, storeIsReady } from './store'
import { createLogger } from './logger'
const { debug, log } = createLogger('UpdateManager')

export declare interface UpdateManager {
    on(event: 'new_update', listener: (update: string | null) => void): this
}
export class UpdateManager extends EventEmitter {
    /**
     * string containing the latest version, null if no newer version is available
     */
    availableUpdate: string | null

    constructor() {
        super()
        const autoCheck = async () => {
            await storeIsReady()
            if (store.data.settings.checkForUpdates) {
                this.checkUpdate()
            }
        }
        setInterval(() => { autoCheck() }, 10 * 60 * 1000)
        autoCheck()
    }

    /**
     * this function check via the github api what is the latest release and confronts it with 
     * @returns null if there is no new version, otherwise a string containing the new version (e.g 0.5.1)
     */
    private async getLatestUpdate(): Promise<string | null> {
        const versionRE = /(\d+)\.(\d+)\.(\d+)/ // regexp parsing version
        try {
            debug('checking for new version')
            await storeIsReady()
            const res = await got.get('https://api.github.com/repos/toto04/webeep-sync/releases/latest', {
                headers: {
                    "Accept": 'application/vnd.github.v3+json'
                }
            })
            const latestVersion: string = JSON.parse(res.body).tag_name.substring(1)
            if (store.data.persistence.ignoredUpdates.includes(latestVersion)) {
                debug('latest update is set to be ignored')
                return null
            }

            const latestMatch = latestVersion.match(versionRE)
            const oldMatch = app.getVersion().match(versionRE)
            // remove the first element to get just the matching groups
            latestMatch.splice(0, 1)
            oldMatch.splice(0, 1)

            const latestV: number[] = latestMatch.map(v => parseInt(v))
            const oldV: number[] = oldMatch.map(v => parseInt(v))

            const newVersion = latestV[0] > oldV[0] || latestV[1] > oldV[1] || latestV[2] > oldV[2]
            if (newVersion) {
                log(`Found new version v${latestVersion}!`)
                return latestVersion
            } else debug(`No new versions found (v${latestVersion})`)
        } catch (e) {
            debug('could not check for new version')
        }
        return null
    }

    /**
     * checks if a new update is available, and caches it in the {@link availableUpdate} string
     * @returns null if there is no new versio, otherwise a string containing the new version (e.g 0.5.1)
     */
    async checkUpdate(): Promise<string> {
        const update = await this.getLatestUpdate()
        this.availableUpdate = update
        this.emit('new_update', update)
        return update
    }
}

export const updates = new UpdateManager()