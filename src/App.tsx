import React, { FC } from 'react'
import ReactDOM from 'react-dom'
import './index.scss'

let App: FC = () => {
    return <div className="App">
        <h1>💖 Hello World!</h1>
        <p>Welcome to Webeep Sync</p>
    </div>
}

ReactDOM.render(<App />, document.body)
