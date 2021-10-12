import { EventEmitter } from 'events'
import keytar from 'keytar'
import got from 'got'
import { Cookie, CookieJar } from 'tough-cookie'
import { decode } from 'html-entities'
import { app, BrowserWindow, protocol, session } from 'electron'

declare interface LoginManager {
    on(eventName: 'ready', handler: () => void): this
    once(eventName: 'ready', handler: () => void): this
    on(eventName: 'token', handler: (token: string) => void): this
    once(eventName: 'token', handler: (token: string) => void): this
    on(eventName: 'logout', handler: () => void): this
    once(eventName: 'logout', handler: () => void): this
}
class LoginManager extends EventEmitter {
    ready: boolean = false
    token: string
    isLogged = false

    loginWindow?: BrowserWindow

    constructor() {
        super()

        keytar.getPassword('webeep-sync', 'token').then(token => {
            if (token) {
                this.token = token
                this.isLogged = true
            }
            this.emit('ready')
        })

        app.once('ready', () => {
            session.defaultSession.webRequest.onBeforeRequest({
                urls: ['https://webeep.polimi.it/my/']
            }, async (res, cb) => {
                // when the /my/ page is reached, login is completed, redirect to obtain token
                cb({ redirectURL: 'https://webeep.polimi.it/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=12345' })
            })

            protocol.registerHttpProtocol('moodlemobile', (req, cb) => {
                // the moodlemobile:// protocol gets intercepted and the token is extracted
                let b64token = req.url.split('token=')[1]
                let token = Buffer.from(b64token, 'base64').toString().split(':::')[1]
                this.isLogged = true
                this.token = token
                this.emit('token', token)
                this.loginWindow?.destroy?.()
            })
        })
    }

    async logout() {
        this.token = undefined
        this.isLogged = false
        this.emit('logout')
        await keytar.deletePassword('webeep-sync', 'token')
    }

    createLoginWindow(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.loginWindow) {
                this.loginWindow = new BrowserWindow({
                    height: 600,
                    width: 1000,
                    frame: true,
                    parent: BrowserWindow.getAllWindows()[0],
                    webPreferences: {
                        webSecurity: false,
                    }
                })
                this.loginWindow.loadURL('http://webeep.polimi.it/auth/shibboleth/index.php')
                this.loginWindow.once('closed', () => {
                    this.loginWindow = undefined
                })
            } else this.loginWindow.focus()

            let onclose = async () => {
                await this.logout()
                resolve(false)
            }
            this.loginWindow.once('close', onclose)
            this.once('token', token => {
                resolve(true)
                this.loginWindow.removeListener('close', onclose)
                keytar.setPassword('webeep-sync', 'token', token)
            })
        })
    }
}

export let loginManager = new LoginManager()