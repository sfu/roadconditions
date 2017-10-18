import React from 'react'
import PropTypes from 'prop-types'
import TinyMCE from 'react-tinymce'

const Announcements = ({ data, campus, changeHandler }) => {
  const updateState = (e, editor) => {
    const announcements = editor.getContent()
    if (data.announcements === announcements) return
    changeHandler({
      data: {
        campuses: {
          [campus]: {
            announcements
          }
        }
      }
    })
  }
  const { announcements } = data
  return (
    <fieldset>
      <label>Announcements</label>
      <TinyMCE
        onChange={updateState}
        onKeyup={updateState}
        content={announcements}
        config={{
          height: 350,
          menubar: false,
          statusbar: false,
          plugins: 'paste, hr, contextmenu, link',
          paste_remove_spans: true,
          paste_strip_class_attributes: 'all',
          paste_word_valid_elements: 'b,strong,i,em',
          toolbar: 'bold italic | hr | link unlink | cut copy paste',
          contextmenu: 'bold italic | link | cut copy paste'
        }}
      />
    </fieldset>
  )
}

Announcements.propTypes = {
  data: PropTypes.object
}

export default Announcements
