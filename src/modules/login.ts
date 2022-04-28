import path from 'path'
import { EventEmitter } from 'events'
import fs from 'fs/promises'
import { app, BrowserWindow, protocol, session, safeStorage } from 'electron'

import { createLogger } from './logger'
const { log, debug } = createLogger('LoginManager')

/** @file the path to the token file which stores the encrypted token */
const tokenPath = path.join(app.getPath('userData'), 'token')

declare interface LoginManager {
    on(eventName: 'ready', handler: () => void): this
    on(eventName: 'token', handler: (token: string) => void): this
    on(eventName: 'logout', handler: () => void): this
    once(eventName: 'ready', handler: () => void): this
    once(eventName: 'token', handler: (token: string) => void): this
    once(eventName: 'logout', handler: () => void): this
}
class LoginManager extends EventEmitter {
    ready = false
    token: string
    isLogged = false

    loginWindow?: BrowserWindow

    constructor() {
        super()

        // reads the token file, if the file exists, decrypts the content and sets the token
        fs.readFile(tokenPath)
            .then(enc => {
                log('previous token found!')
                this.token = safeStorage.decryptString(enc)
                this.isLogged = true
            })
            .catch(() => log('token not found'))
            .finally(() => this.emit('ready'))

        app.once('ready', () => {
            session.defaultSession.webRequest.onBeforeRequest({
                urls: ['https://webeep.polimi.it/my/']
            }, async (res, cb) => {
                // when the /my/ page is reached, login is completed, redirect to obtain token
                debug('Reached /my/ page, redirecting to moodle mobile token')
                cb({ redirectURL: 'https://webeep.polimi.it/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=12345' })
            })

            // the moodlemobile:// protocol gets intercepted and the token is extracted from the response
            protocol.registerHttpProtocol('moodlemobile', (req, cb) => {
                debug('Intercepted call to moodlemobile protocol')
                const b64token = req.url.split('token=')[1]
                const token = Buffer.from(b64token, 'base64').toString().split(':::')[1]
                this.isLogged = true
                this.token = token
                this.emit('token', token)
                this.loginWindow?.destroy?.()
            })
        })
    }

    /**
     * unsets the token and deletes the token file
     */
    async logout() {
        this.token = undefined
        this.isLogged = false
        this.emit('logout')
        try {
            // if the file does not exist, just ignore the error when trying to unlink it
            await fs.unlink(tokenPath)
            // eslint-disable-next-line no-empty
        } catch (e) { }
    }

    /**
     * open the login window, if it's already open, focus it
     * 
     * The login process is started at the login entry point for WeBeep, the user gets reiderected
     * througout the different pages (aunicalogin, SPID identity provider, ecc.) as they normally 
     * would by accessing the WeBeep on a web browser.
     * When the user is finally redirected to the main page, it's assured they have successfully
     * logged in, and they can be redirected to the moodle mobile token page to retrieve the token.
     * Listeners for redirection and token parsing are declared in the {@link LoginManager} class
     * constructor
     * 
     * If at any time before the token gets retrieved, the window closes, a failed login attempt is 
     * assumed, and the {@link logout} function gets called
     * 
     * @returns {Promise<boolean>} resolves to true if the users logs in, to false if the window 
     * gets closed without the login process completing
     */
    createLoginWindow(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.loginWindow) {
                debug('Creating Login Window...')
                // create the window if it doesn't exist
                this.loginWindow = new BrowserWindow({
                    height: 600,
                    width: 1000,
                    autoHideMenuBar: true,
                    frame: true,
                    parent: BrowserWindow.getAllWindows()[0],
                    webPreferences: {
                        webSecurity: false,
                    }
                })
                // load the login entry point of WeBeep
                this.loginWindow.loadURL('http://webeep.polimi.it/auth/shibboleth/index.php')
                this.loginWindow.once('closed', () => {
                    this.loginWindow = undefined
                })
            } else this.loginWindow.focus() // if the window already exists, focus it

            // called when the window gets closed before the token is retrieved
            const onclose = async () => {
                log('Login process aborted!')
                await this.logout()
                resolve(false)
            }
            this.loginWindow.once('close', onclose)
            this.once('token', token => {
                // when the token is retrieved, remove the logout listener and resolve the promise
                log('Login process completed!')
                resolve(true)
                this.loginWindow.removeListener('close', onclose)
                fs.writeFile(tokenPath, safeStorage.encryptString(token)) // writes the token to file
            })
        })
    }
}

/**
 * Manages the token for the moodle api, encrypts and stores it upon login and retrieves it on app
 * launch.
 * Also manages the that lets the user input their credentials.
 * @see {@link LoginManager.createLoginWindow} for more about how the login process works
 */
export const loginManager = new LoginManager()