import React from 'react'
import PropTypes from 'prop-types'
import format from 'date-fns/format'

const LastUpdated = ({ lastUpdated }) => {
  return (
    <section id="lastupdated" className="main update">
      <p>
        Last updated{' '}
        {format(lastUpdated, '[at] h:mm a [on] dddd, MMMM DD, YYYY')}
      </p>
    </section>
  )
}

LastUpdated.propTypes = {
  lastUpdated: PropTypes.number
}

export default LastUpdated
