import React, { FC } from 'react'
import { IconType } from 'react-icons'
import { IoCheckbox, IoSquareOutline } from 'react-icons/io5'

interface CheckboxProps {
    value: boolean
    onChange: (v: boolean) => void
    color?: string
    PositiveIcon?: IconType
    NegativeIcon?: IconType
}

export let Checkbox: FC<CheckboxProps> = (props) => {
    let PositiveIcon = props.PositiveIcon ?? IoCheckbox
    let NegativeIcon = props.NegativeIcon ?? IoSquareOutline
    return <div className="checkbox" style={{ backgroundColor: props.value ? props.color : undefined }}>
        {props.value
            ? <PositiveIcon className="active" onClick={() => props.onChange(false)} />
            : <NegativeIcon onClick={() => props.onChange(true)} color={props.color} />
        }
    </div>
}