import React, { FC } from "react"
import { IconType } from "react-icons"
import { IoCheckbox, IoSquareOutline } from "react-icons/io5"

interface CheckboxProps {
  value: boolean
  onChange: (v: boolean, e: React.MouseEvent) => void
  color?: string
  PositiveIcon?: IconType
  NegativeIcon?: IconType
}

export const Checkbox: FC<CheckboxProps> = props => {
  const PositiveIcon = props.PositiveIcon ?? IoCheckbox
  const NegativeIcon = props.NegativeIcon ?? IoSquareOutline
  return (
    <div
      className="checkbox"
      style={{ backgroundColor: props.value ? props.color : undefined }}
    >
      {props.value ? (
        <PositiveIcon
          className="active"
          onClick={e => props.onChange(false, e)}
        />
      ) : (
        <NegativeIcon
          onClick={e => props.onChange(true, e)}
          color={props.color}
        />
      )}
    </div>
  )
}
