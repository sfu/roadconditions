import React, { Component } from 'react'
import axios from 'axios'
import deepmerge from 'deepmerge'

import BeforeUnload from 'components/BeforeUnload'
import LastUpdated from 'components/LastUpdated'
import Message from 'components/Message'
import Campus from 'components/Campus'
import RoadStatus from 'components/RoadStatus'
import Announcements from 'components/Announcements'

export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      data: {},
      fetching: true,
      dirty: false,
      message: {}
    }

    this.handleChange = this.handleChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
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

  handleSubmit(e) {
    e.preventDefault()
    const newState = {
      ...this.state.data,
      lastUpdated: Date.now()
    }
    axios
      .post('/api/3/current', newState)
      .then(response => {
        window.scrollTo(0, 1)
        this.setState(
          {
            ...this.state,
            data: response.data,
            message: {
              status: 'success',
              text: 'The SFU Road Conditions report has been updated.'
            }
          },
          () => {
            window.setTimeout(() => {
              this.setState({
                ...this.state,
                message: {}
              })
            }, 6000)
          }
        )
      })
      .catch(() => {
        this.setState({
          ...this.state,
          message: {
            status: 'error',
            text:
              'The server reported an error when trying to process the form. Please wait a moment and try again.'
          }
        })
      })
  }

  render() {
    if (this.state.fetching) {
      return <p>Loading...</p>
    } else {
      const { data, dirty } = this.state
      return (
        <BeforeUnload dirty={dirty}>
          <div>
            <LastUpdated at={data.lastUpdated} />
            <div className="main">
              {this.state.message.text ? (
                <Message message={this.state.message} />
              ) : null}
              <form>
                <Campus
                  campus="burnaby"
                  data={data.campuses.burnaby}
                  changeHandler={this.handleChange}
                >
                  <RoadStatus />
                  <Announcements />
                </Campus>

                <div className="surrey_vancouver">
                  <Campus
                    campus="vancouver"
                    data={data.campuses.vancouver}
                    changeHandler={this.handleChange}
                  >
                    <Announcements />
                  </Campus>
                  <Campus
                    campus="surrey"
                    data={data.campuses.surrey}
                    changeHandler={this.handleChange}
                  >
                    <Announcements />
                  </Campus>
                </div>
                <div id="submit-container">
                  <input
                    onClick={this.handleSubmit}
                    type="submit"
                    value="Submit"
                  />
                </div>
              </form>
            </div>
          </div>
        </BeforeUnload>
      )
    }
  }
}
