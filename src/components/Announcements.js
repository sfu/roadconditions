import React from 'react'
import PropTypes from 'prop-types'
import TinyMCE from 'react-tinymce/dist/react-tinymce.js'

const Announcements = ({ data }) => {
  const { announcements } = data
  return (
    <fieldset>
      <label>Announcements</label>
      <TinyMCE content={announcements} />
    </fieldset>
  )
}

Announcements.propTypes = {
  data: PropTypes.object
}

export default Announcements
