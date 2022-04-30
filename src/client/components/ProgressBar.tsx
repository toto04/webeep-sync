import React, { FC } from 'react'

export const PrograssBar: FC<{ progress: number }> = (props) => {
    const width = (isNaN(props.progress) ? 0 : (props.progress * 100)) + '%'
    return <div className="progress-bar">
        <div className="progress-bar-inside" style={{ width }} />
    </div>
}