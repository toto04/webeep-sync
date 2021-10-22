import React, { FC } from 'react'

export let PrograssBar: FC<{ progress: number }> = (props) => {
    return <div className="progress-bar">
        <div className="progress-bar-inside" style={{ width: props.progress * 100 + '%' }} />
    </div>
}