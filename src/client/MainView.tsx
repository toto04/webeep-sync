import React, { FC, useContext } from 'react'
import { IoSettingsSharp, IoTime } from 'react-icons/io5'
import { LoginContext } from './LoginContext'

export let MainView: FC<{ onLogin: () => void }> = (props) => {
    let { isLogged, expiring, username } = useContext(LoginContext)
    return <div className="main-view">
        <div className="sync-status">
            {/* <IoTime /> */}
            <span>last synced</span>
            <h1>1 minute ago</h1>
        </div>
        <div className="user-status">
            <IoSettingsSharp />
            {isLogged
                ? <span>{username}</span>
                : <a className="text-button" onClick={() => props.onLogin()}>
                    Accedi...
                </a>
            }
        </div>
    </div>
}