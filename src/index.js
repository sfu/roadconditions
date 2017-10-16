const React = require('react')
const ReactDOM = require('react-dom')

import App from './App'

const ROOT_EL = document.getElementById('page-content')
const CONDITIONS_JSON = document.getElementById('conditions_json').innerHTML

ReactDOM.render(<App conditions={JSON.parse(CONDITIONS_JSON)} />, ROOT_EL)
