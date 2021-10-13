import React, { FC, useState } from 'react'
import { IoAddCircleOutline, IoRemoveCircle } from 'react-icons/io5'

export let Checkbox: FC<{ value: boolean, onChange: (v: boolean) => void, color?: string }> = (props) => {
    return <div className="checkbox">
        {props.value
            ? <IoRemoveCircle className="active" onClick={() => props.onChange(false)} color={props.color} />
            : <IoAddCircleOutline onClick={() => props.onChange(true)} color={props.color} />
        }
    </div>
}