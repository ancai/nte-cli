const path = require('path')
const fs = require('fs')

const log = require('../util/log')
const lang = require('../util/lang')
const compile = require('../compiler')
const { CONFIG_NAME } = require('../constant/global')
const defaultConfig = require('../constant/default')


/**
 * build including of packing ,injection and compression
 */
module.exports = () => {
  const configPath = path.resolve(CONFIG_NAME)
  if (fs.existsSync(configPath)) {
    let config = lang.mergeJSON(defaultConfig, require(configPath))
    // start compile project
    log.info('begin to build ...')
    compile(config)
  } else {
    log.err('No configuration file exists.')
    log.err('please execute the "nte-cli init" command')
  }
}