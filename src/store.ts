import path from 'path'
import { app } from 'electron'
import { Low, JSONFile } from 'lowdb'

interface Store {
    settings: {}
}

let storePath = path.join(app.getPath('userData'), 'store.json')
export let store = new Low<Store>(new JSONFile(storePath))

async function initalizeStore() {
    await store.read()
    store.data ||= { settings: {} }
    await store.write()
}
initalizeStore()