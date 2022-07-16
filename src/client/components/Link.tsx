import { shell } from 'electron';
import React, { FC } from 'react';

export const Link: FC<{ href: string; className?: string; }> = props => {
    return <a onClick={e => {
        e.preventDefault();
        shell.openExternal(props.href);
    }} className={props.className}>
        {props.children}
    </a>;
};
