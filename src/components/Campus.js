import React from 'react'
import PropTypes from 'prop-types'
import titleize from 'lib/titleize'

const Campus = props => {
  return (
    <div className="conditions-container">
      <h3>{titleize(props.campus)} Campus</h3>
      {React.Children.map(props.children, child =>
        React.cloneElement(child, { ...props })
      )}
    </div>
  )
}

Campus.propTypes = {
  campus: PropTypes.string.isRequired,
  children: PropTypes.any
}

export default Campus
