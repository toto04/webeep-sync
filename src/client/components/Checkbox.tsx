import React, { FC, useState } from 'react'
import { IconType } from 'react-icons'
import { IoAddCircleOutline, IoRemoveCircle } from 'react-icons/io5'

interface CheckboxProps {
    value: boolean
    onChange: (v: boolean) => void
    color?: string
    PositiveIcon?: IconType
    NegativeIcon?: IconType
}

export let Checkbox: FC<CheckboxProps> = (props) => {
    let PositiveIcon = props.PositiveIcon ?? IoRemoveCircle
    let NegativeIcon = props.NegativeIcon ?? IoAddCircleOutline
    return <div className="checkbox">
        {props.value
            ? <PositiveIcon className="active" onClick={() => props.onChange(false)} color={props.color} />
            : <NegativeIcon onClick={() => props.onChange(true)} color={props.color} />
        }
    </div>
}