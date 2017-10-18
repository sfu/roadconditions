import React, { Component } from 'react'
import axios from 'axios'
import deepmerge from 'deepmerge'

import LastUpdated from 'components/LastUpdated'
import Campus from 'components/Campus'
import RoadStatus from 'components/RoadStatus'
import Announcements from 'components/Announcements'

export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      data: {},
      fetching: true,
      dirty: false
    }

    this.handleChange = this.handleChange.bind(this)
  }

  componentDidMount() {
    axios
      .get('/api/3/current')
      .then(response => {
        this.setState({
          fetching: false,
          data: response.data
        })
      })
      .catch(error => {
        console.error(error)
      })
  }

  handleChange(update) {
    const newState = deepmerge(this.state, update)
    newState.dirty = true
    this.setState(newState)
  }

  render() {
    if (this.state.fetching) {
      return <p>Loading...</p>
    } else {
      const { data } = this.state
      return (
        <div>
          <LastUpdated at={data.lastUpdated} />
          <form>
            <Campus
              campus="burnaby"
              data={data.campuses.burnaby}
              changeHandler={this.handleChange}
            >
              <RoadStatus />
              <Announcements />
            </Campus>
            <Campus campus="vancouver" data={data.campuses.vancouver} />
            <Campus campus="surrey" data={data.campuses.surrey} />
          </form>
        </div>
      )
    }
  }
}
