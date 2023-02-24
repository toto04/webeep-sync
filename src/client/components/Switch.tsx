import React, { FC } from "react"
import _Switch from "react-switch"

export const Switch: FC<{
  onChange: (v: boolean) => void
  checked: boolean
  onColor?: string
  offColor?: string
  disabled?: boolean
}> = props => {
  return (
    <_Switch
      disabled={props.disabled}
      onChange={v => props.onChange(v)}
      onColor={props.onColor ?? "#40c8e0"}
      offColor={props.offColor}
      checkedIcon
      uncheckedIcon
      handleDiameter={16}
      height={22}
      width={40}
      checked={props.checked}
      className="switch"
    />
  )
}
