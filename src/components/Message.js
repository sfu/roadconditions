import React from 'react'
import PropTypes from 'prop-types'

const Message = ({ message }) => {
  const { text, status } = message
  return (
    <section id="message-container" className={status}>
      <div>
        <span>{text}</span>
      </div>
    </section>
  )
}

Message.propTypes = {
  message: PropTypes.shape({
    text: PropTypes.string,
    status: PropTypes.string
  })
}

export default Message
