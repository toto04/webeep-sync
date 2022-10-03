import React, { FC, useState } from 'react'
import { IoClose } from 'react-icons/io5'

export const Modal: FC<{
    onClose: () => void
    title: string
    style?: React.CSSProperties
    children: React.ReactNode
}> = (props) => {
    const [shadow, setShadow] = useState(false)

    return <div
        className="modal-container"
        onClick={e => {
            if (e.target === e.currentTarget) props.onClose()
        }}
        onKeyDown={e => {
            if (e.key === 'Escape') {
                e.preventDefault()
                props.onClose()
            }
        }}
    >
        <div className="modal" style={props.style}>
            <div className={`modal-header ${shadow ? 'shadow' : undefined}`}>
                <h3>{props.title}</h3>
            </div>
            <IoClose className="close clickable" onClick={() => { props.onClose() }} />
            <div className="modal-content" onScroll={e => {
                if (e.currentTarget.scrollTop > 5 && !shadow) setShadow(true)
                else if (e.currentTarget.scrollTop <= 5 && shadow) setShadow(false)
            }}>
                {props.children}
            </div>
        </div>
    </div >
}