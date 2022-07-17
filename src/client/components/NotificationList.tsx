import { ipcRenderer } from "electron";
import React, { FC, useEffect, useRef, useState, } from "react";
import { useTranslation } from "react-i18next";
import { IoNotifications } from "react-icons/io5";
import { Notification } from "../../modules/moodle";
import useOnOutsideClick from "../hooks/useOnOutsideClick";
import { NotificationInfo } from "./NotificationInfo";

// this is here to throttle the click event to prevent the tooltip from reopening immediately
let clickEnabled = true;

/**
 * Component containing the Notification icon and the tooltip list that appears when the icon is 
 * clicked.
 * 
 * Each element and the detailed modal is handled in the {@link NotificationInfo} component.
 */
export const NotificationList: FC = props => {
    const [showingTooltip, setShowingTooltip] = useState(false)

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { t } = useTranslation('client', { keyPrefix: 'mainView.notifications' })

    const wrapRef = useRef<HTMLDivElement>(null)
    useOnOutsideClick(wrapRef, () => {
        if (showingTooltip) {
            setShowingTooltip(false)
            // wait a bit to prevent the tooltip from reopening immediately
            clickEnabled = false
            setTimeout(() => clickEnabled = true, 250)
        }
    })

    useEffect(() => {
        // notification event handler
        ipcRenderer.on('notifications', (e, n) => setNotifications(n))
    }, [])

    useEffect(() => {
        if (showingTooltip) ipcRenderer.invoke('get-notifications').then(n => setNotifications(n));
    }, [showingTooltip])

    return <div
        className="notification-icon"
        tabIndex={-1}
        onKeyDown={e => {
            if (!showingTooltip) return
            if (e.key === 'Escape') {
                // hide the tooltip if esc is pressed
                e.preventDefault()
                setShowingTooltip(false)
            }
        }}
    >
        <IoNotifications className={'clickable' + (showingTooltip ? ' clicked' : '')}
            onClick={() => {
                if (!showingTooltip && clickEnabled) setShowingTooltip(true)
            }}
        />
        {showingTooltip && <div ref={wrapRef} className="notification-list">
            {notifications && notifications.length
                ? notifications.map((n, i) => <NotificationInfo notification={n} key={'notification' + i} />)
                : <div className="no-notifications">{t('no_notifications')}</div>
            }
        </div>}
    </div>
}