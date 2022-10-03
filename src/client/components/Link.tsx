import { shell } from 'electron';
import React, { FC } from 'react';

/**
 * anchor tag that opens the link in the external browser
 */
export const Link: FC<{
    href: string
    className?: string
    children: React.ReactNode
}> = props => {
    return <a onClick={e => {
        e.preventDefault();
        shell.openExternal(props.href);
    }} className={props.className}>
        {props.children}
    </a>;
};
