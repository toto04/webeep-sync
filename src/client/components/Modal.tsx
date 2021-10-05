import React, { FC, useEffect, useState } from 'react'
import { ipcRenderer } from 'electron'

export let Modal: FC<{ onClose: () => void }> = (props) => {
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
        <div className="modal">
            {props.children}
        </div>
    </div >
}