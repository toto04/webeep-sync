import React, { FC } from 'react'
import { Modal } from '../components/Modal'
import { NewFilesList } from '../../helpers/download'

export let NewFilesModal: FC<{ onClose: () => void, files: NewFilesList }> = (props) => {
    return <Modal onClose={() => props.onClose()}>
        <div className="new-files-modal">
            <h3>New files downloaded</h3>
        </div>
    </Modal>
}