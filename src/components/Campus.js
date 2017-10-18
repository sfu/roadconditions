import React from 'react'
import PropTypes from 'prop-types'
import titleize from 'lib/titleize'

const Campus = ({ campus, data, children }) => {
  return (
    <div className="conditions-container">
      <h3>{titleize(campus)} Campus</h3>
      {React.Children.map(children, child =>
        React.cloneElement(child, {
          data,
          campus
        })
      )}
    </div>
  )
}

Campus.propTypes = {
  campus: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
  children: PropTypes.any
}

export default Campus
