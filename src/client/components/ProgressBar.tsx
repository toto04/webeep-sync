import React, { FC } from 'react'

export let PrograssBar: FC<{ progress: number }> = (props) => {
    let width = (isNaN(props.progress) ? 0 : (props.progress * 100)) + '%'
    return <div className="progress-bar">
        <div className="progress-bar-inside" style={{ width }} />
    </div>
}