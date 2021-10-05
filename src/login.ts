import keytar from 'keytar'
import got from 'got'
import { CookieJar } from 'tough-cookie'
import { decode } from 'html-entities'

class LoginManager {
    login: string
    password: string
    token: string

    isLogged: boolean = false
    expiring: boolean = false

    async updateCredentials(login: string, password: string) {
        this.login = login
        this.password = password
        this.isLogged = false

        try {
            this.token = await this.refreshToken()
            this.isLogged = true
            return true
        } catch (e) {
            return false
        }
    }

    async refreshToken() {
        // TODO: manage network problems
        // TODO: manage wrong credentials

        const client = got.extend({
            cookieJar: new CookieJar(),
            throwHttpErrors: false,
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
            // expiring password
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
        return Buffer.from(b64token, 'base64').toString().split(':::')[1]
    }
}

export let loginManager = new LoginManager()