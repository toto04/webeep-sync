import got from 'got'
import { loginManager } from './login'

class MoodleClient {
    async call(wsfunction: string, data?: { [key: string]: string }) {
        if (!loginManager.isLogged) return
        let res = await got.post('https://webeep.polimi.it/webservice/rest/server.php', {
            body: JSON.stringify({
                token: loginManager.token,
                wsfunction,
                moodlewsrestformat: 'json',
                ...data
            })
        })
        return JSON.parse(res.body)
    }
    async getUserID() {
        let { userid } = await this.call('core_webservice_get_site_info')
    }
}