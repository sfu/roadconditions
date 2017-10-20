const path = require('path')
const ConditionsStore = require('./lib/roadconditions-store')

const configFile = process.env.CONFIGFILE || __dirname + '/config/config.json'
const config = require(path.resolve(configFile))
const storageEngine = config.storage.engine
let store = new ConditionsStore[storageEngine](config.storage[storageEngine])

store.on('ready', () => {
  const v2Data = store.get()

  if (v2Data.hasOwnProperty('campuses')) {
    throw new Error('Already migrated!')
  }

  const burnabyRoads = v2Data.conditions.burnaby.roads

  const v3Data = {
    campuses: {
      burnaby: {
        roads: {
          status: burnabyRoads.status,
          severity: burnabyRoads.severity
        },
        announcements: v2Data.announcements[0]
      },
      surrey: { announcements: '' },
      vancouver: { announcements: '' }
    },
    lastUpdated: v2Data.lastupdated
  }
  store.set(v3Data)
})
