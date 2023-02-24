import React, { FC } from "react"

import { Modal } from "../components/Modal"
import { NewFilesList } from "../../modules/download"

import { useTranslation } from "react-i18next"
import { NewFilesCourseCollapsable } from "../components/NewFilesCourseCollapsable"

export const NewFilesModal: FC<{
  onClose: () => void
  files: NewFilesList
}> = props => {
  const { t } = useTranslation("client", { keyPrefix: "newFiles" })

  let count = 0
  for (const course in props.files) {
    count += props.files[course].length
  }
  return (
    <Modal title={t("newFiles", { count })} onClose={() => props.onClose()}>
      <div className="new-files-modal">
        {Object.entries(props.files).map(([course, files]) => (
          <NewFilesCourseCollapsable
            key={"collaps" + course}
            name={course}
            files={files}
          />
        ))}
      </div>
    </Modal>
  )
}
