import React, { FC, useState } from "react"
import { IoEllipsisHorizontal } from "react-icons/io5"

import { FileProgress } from "../../modules/download"
import { PrograssBar } from "./ProgressBar"

import { breakableString, formatSize } from "../../util"

let to: NodeJS.Timeout
export const SyncProgressList: FC<{ files: FileProgress[] }> = props => {
  const [showingTooltip, setShowingTooltip] = useState(false)

  return (
    <div
      className="sync-progress-list"
      onMouseOver={() => {
        clearTimeout(to)
        if (!showingTooltip) setShowingTooltip(true)
      }}
      onMouseOut={() => {
        if (showingTooltip) {
          // thats a dumb workaround, but fuck this i hate this i dont want to do this
          // anymore, this works and this stays
          to = setTimeout(() => {
            setShowingTooltip(false)
          }, 20)
        }
      }}
    >
      <IoEllipsisHorizontal
        className="clickable progress-ellipses"
        onClick={() => setShowingTooltip(true)}
      />

      {showingTooltip ? (
        <div className="tooltip">
          {props.files
            .filter((_, i) => i !== 0)
            .map((f, i) => {
              const perc = f.downloaded / f.total
              return (
                <div className="file-progress" key={`file-progress-list_${i}`}>
                  <span className="filename">
                    {breakableString(f.filename)}
                  </span>
                  <span className="filepath">
                    {breakableString(f.absolutePath)}
                  </span>
                  <div className="file-size-info">
                    <span>
                      {formatSize(f.downloaded)}/{formatSize(f.total)}
                    </span>
                    <span>{Math.floor(perc * 1000) / 10}%</span>
                  </div>
                  <PrograssBar progress={perc} />
                </div>
              )
            })}
        </div>
      ) : undefined}
    </div>
  )
}
