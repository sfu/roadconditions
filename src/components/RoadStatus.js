import React from 'react'
import PropTypes from 'prop-types'
import { NORMAL, WARNING, ALERT } from 'constants/severity'
import titleize from 'lib/titleize'

const STATUS_SEVERITY_MAP = {
  dry: NORMAL,
  wet: WARNING,
  icy: ALERT,
  'partially snow-covered': WARNING,
  'snow-covered': ALERT,
  closed: ALERT
}

const roadStatusOptions = s =>
  s.map((x, i) => (
    <option key={`status_${i}`} value={x}>
      {titleize(x)}
    </option>
  ))

const roadSeverityOptions = s =>
  s.map((x, i) => (
    <option key={`severity_${i}`} value={x}>
      {titleize(x)}
    </option>
  ))

const onChangeRoadStatus = (status, campus, changeHandler) => {
  // when the status change, need to dispatch a state change
  // with both the new status, and the matching severity
  const severity = STATUS_SEVERITY_MAP[status]
  const update = {
    data: {
      campuses: {
        [campus]: {
          roads: {
            status,
            severity
          }
        }
      }
    }
  }
  changeHandler(update)
}

const onChangeRoadSeverity = (severity, campus, changeHandler) => {
  // when the severity changes, need to dispatch a state change
  // with the new severity
  changeHandler({
    data: {
      campuses: {
        [campus]: {
          roads: {
            severity
          }
        }
      }
    }
  })
}

const RoadStatus = ({ data, campus, changeHandler }) => {
  const { roads } = data
  return (
    <fieldset>
      <div
        className="conditionsitem"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${window.ENV.authMaillist ===
          'roadconditions-dispatchers'
            ? 2
            : 3}, 1fr)`,
          gridColumnGap: '1em'
        }}
      >
        <label>Roads</label>

        <select
          className="status"
          value={roads.status}
          onChange={e => {
            onChangeRoadStatus(e.target.value, campus, changeHandler)
          }}
        >
          {roadStatusOptions(Object.keys(STATUS_SEVERITY_MAP))}
        </select>

        {window.ENV.authMaillist !== 'roadconditions-dispatchers' ? (
          <select
            className="severity"
            value={roads.severity}
            onChange={e => {
              onChangeRoadSeverity(e.target.value, campus, changeHandler)
            }}
          >
            {roadSeverityOptions([NORMAL, WARNING, ALERT])}
          </select>
        ) : null}
      </div>
    </fieldset>
  )
}

RoadStatus.propTypes = {
  data: PropTypes.object, // this is optional otherwise PropTypes throws a warning (https://github.com/facebook/react/issues/4494)
  campus: PropTypes.string, // this is optional otherwise PropTypes throws a warning (https://github.com/facebook/react/issues/4494)
  changeHandler: PropTypes.func
}

export default RoadStatus
