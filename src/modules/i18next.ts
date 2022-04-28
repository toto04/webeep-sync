import path from 'path'
import i18n from 'i18next'
import I18Backend from 'i18next-fs-backend'

import { __static } from '../util'

let initializing = false
let initialized = false

export function i18nInit(): Promise<void> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
        if (initialized) {
            resolve()
            return
        }
        if (initializing) i18n.on('loaded', () => resolve())
        else {

            initializing = true
            await i18n.use(I18Backend).init({
                ns: ['common', 'tray', 'client', 'notifications'],
                defaultNS: 'common',
                fallbackLng: 'en',
                saveMissing: true,
                backend: {
                    loadPath: path.join(__static, '/locales/{{lng}}/{{ns}}.json'),
                    addPath: path.join(__static, '/locales/{{lng}}/{{ns}}.missing.json')
                }
            })
            initialized = true
            resolve()

        }
    })
}

export { i18n }