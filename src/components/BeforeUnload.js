import React from 'react'
import PropTypes from 'prop-types'

class BeforeUnload extends React.Component {
  constructor(props) {
    super(props)
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this)
  }
  componentDidMount() {
    console.log('CDM')
    window.addEventListener('beforeunload', this.handleBeforeUnload)
  }
  componentWillUnmount() {
    console.log('CWUM')
    window.removeEvnetListener('beforeunload', this.handleBeforeUnload)
  }

  handleBeforeUnload(ev) {
    const str = `You've made changes on this page which aren't saved. If you leave you will lose these changes.`
    if (this.props.dirty) {
      ev.returnValue = str
      return str
    }
  }

  render() {
    const { children = null } = this.props
    return children
  }
}

BeforeUnload.propTypes = {
  dirty: PropTypes.bool.isRequired,
  children: PropTypes.any
}

export default BeforeUnload
