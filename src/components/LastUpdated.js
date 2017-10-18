import React from 'react'
import PropTypes from 'prop-types'
import format from 'date-fns/format'

const LastUpdated = ({ at }) => {
  return (
    <section id="lastupdated" className="update">
      <p>Last updated {format(at, '[at] h:mm a [on] dddd, MMMM DD, YYYY')}</p>
    </section>
  )
}

LastUpdated.propTypes = {
  at: PropTypes.number
}

export default LastUpdated
