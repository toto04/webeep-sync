import { EventEmitter } from 'events'
import keytar from 'keytar'
import got from 'got'
import { CookieJar } from 'tough-cookie'
import { decode } from 'html-entities'

import { store } from './store'

export enum TokenStatusCode {
    success,
    network_error,
    login_error
}

type TokenResult = {
    code: TokenStatusCode.success,
    token: string
} | {
    code: TokenStatusCode.login_error | TokenStatusCode.network_error
}

class LoginManager extends EventEmitter {
    ready: boolean = false
    login?: string = '...' // just to avoid an ugly undefined while loading
    password: string
    token: string

    isLogged: boolean = true
    expiring: boolean = false

    constructor() {
        super()
        store.read().then(async () => {
            // get the credentials from storage on startup
            if (!await this.restoreSession()) {
                this.login = undefined
                this.isLogged = false
            }
            this.ready = true
            this.emit('ready')
        })
    }

    private async restoreSession(): Promise<boolean> {
        let login = store.data.login
        if (!login) return false
        let password = await keytar.getPassword('webeep-sync', login)
        if (!password) return false
        this.login = login
        this.password = password
        console.log('restoring login as ' + login)

        let tknres = await this.refreshToken()
        console.log('login status: ' + TokenStatusCode[tknres.code])
        if (tknres.code !== TokenStatusCode.login_error) {
            // keeps the app logged in the case of a network_error
            // a new token will be requested as soon as internet connection is re-established
            this.token = tknres.code === TokenStatusCode.success
                ? tknres.token
                : await keytar.getPassword('webeep-sync', 'moodle_token')
            this.isLogged = true
            return true
        } else return false
    }

    async updateCredentials(login: string, password: string) {
        console.log('attempting login as ' + login)
        this.login = login
        this.password = password
        this.isLogged = false

        let tknres = await this.refreshToken()
        console.log('login status: ' + TokenStatusCode[tknres.code])
        if (tknres.code === TokenStatusCode.success) {
            this.token = tknres.token
            this.isLogged = true
            store.data.login = login
            await Promise.all([
                store.write(),
                keytar.setPassword('webeep-sync', login, password)
            ])
            return true
        } else {
            return false
        }
    }

    async logout() {
        this.isLogged = false
        store.data.login = undefined
        await Promise.all([
            store.write(),
            this.login ? keytar.deletePassword('webeep-sync', this.login) : undefined
        ])
        delete this.login
    }

    async refreshToken(): Promise<TokenResult> {
        try {
            const client = got.extend({
                cookieJar: new CookieJar(),
                timeout: { request: 10000 }
            })

            let res = await client.get('http://webeep.polimi.it/auth/shibboleth/index.php')
            let url = 'https://aunicalogin.polimi.it' + res.body.match(/<form.*action="([^"]*)"/)?.[1]

            // have to disable redirects for this one thing because after 302 got performs the redirect with
            // the same protocol of the initial request, but the server breaks if the following requests 
            // aren't GET (cause the POST body gets sent again as well)
            res = await client.post(url, {
                followRedirect: false,
                form: {
                    evn_conferma: '',
                    login: this.login,
                    password: this.password
                }
            })
            if (res.statusCode === 200) {
                // if there's no redirect, either there's an error (like invalid password)
                // or a warning (e.g. password expiring soon)
                let match = res.body.match(/alert alert-danger.+Code: (\d*)/s)
                if (match) {
                    let [_, errCode] = match
                    console.log(errCode)
                    return { code: TokenStatusCode.login_error }
                }
                // TODO: distinguish warnings
                this.expiring = true
                url = 'https://aunicalogin.polimi.it' + res.body.match(/<form.*action="([^"]*)"/)?.[1]
                res = await client.post(url, {
                    followRedirect: false,
                    form: { evn_continua: '' }
                })
            } else { this.expiring = false }
            res = await client.get(res.headers.location!)

            let [_, RelayState, SAMLResponse] = res.body.match(/<form.*<input type="hidden" name="RelayState" value="([^"]*)".*<input type="hidden" name="SAMLResponse" value="([^"]*)/s) ?? []
            RelayState = decode(RelayState)
            res = await client.post('https://webeep.polimi.it/Shibboleth.sso/SAML2/POST', {
                form: { RelayState, SAMLResponse }
            })
            // Login completed!!

            res = await client.get('https://webeep.polimi.it/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=12345&urlscheme=moodledownloader', {
                followRedirect: false
            })
            let b64token = res.headers.location!.split('token=')[1]
            let token = Buffer.from(b64token, 'base64').toString().split(':::')[1]
            keytar.setPassword('webeep-sync', 'moodle_token', token)
            return {
                code: TokenStatusCode.success,
                token
            }
        } catch (e) {
            console.error(e)
            return { code: TokenStatusCode.network_error }
        }
    }
}

export let loginManager = new LoginManager()