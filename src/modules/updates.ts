import { EventEmitter } from 'events'

import { app } from 'electron'
import got from 'got'
import { store, initializeStore } from './store'
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
        let autoCheck = async () => {
            await initializeStore()
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
        let versionRE = /(\d+)\.(\d+)\.(\d+)/ // regexp parsing version
        try {
            debug('checking for new version')
            await initializeStore()
            let res = await got.get('https://api.github.com/repos/toto04/webeep-sync/releases/latest', {
                headers: {
                    "Accept": 'application/vnd.github.v3+json'
                }
            })
            let latestVersion: string = JSON.parse(res.body).tag_name.substring(1)
            if (store.data.persistence.ignoredUpdates.includes(latestVersion)) {
                debug('latest update is set to be ignored')
                return null
            }

            let latestMatch = latestVersion.match(versionRE)
            let oldMatch = app.getVersion().match(versionRE)
            // remove the first element to get just the matching groups
            latestMatch.splice(0, 1)
            oldMatch.splice(0, 1)

            let latestV: number[] = latestMatch.map(v => parseInt(v))
            let oldV: number[] = oldMatch.map(v => parseInt(v))

            let newVersion = latestV[0] > oldV[0] || latestV[1] > oldV[1] || latestV[2] > oldV[2]
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
    async checkUpdate() {
        let update = await this.getLatestUpdate()
        this.availableUpdate = update
        this.emit('new_update', update)
        return update
    }
}

export let updates = new UpdateManager()