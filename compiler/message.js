const fs = require('fs')
const path = require('path')
const log = require('../util/log')

/**
 * message tip: check modulePath validity
 * @param {String} modulePath
 * @param {String} parentPath the parasitifer moudle path
 * @param {Object} config
 * @returns {Boolean}
 */
const checkExist = (modulePath, parentPath, config) => {
  let flag
  if (!(flag = fs.existsSync(modulePath))) {
    log.warn(`not found: [${modulePath}] ---> [${parentPath}], please check !`, config.log)
  }
  return flag
}

/**
 * message tip: attempt to visit modulePath after last failure
 * @param {String} modulePath 
 * @param {String} parentPath 
 * @param {Boolean} config
 * @returns {Boolean}
 */
const tryToVisit = (modulePath, parentPath, config) => {
  let flag
  log.warn(`try to visit a new way: [${modulePath}] ---> [${parentPath}]`)
  if (!(flag = fs.existsSync(modulePath))) {
    log.warn(`not found: [${modulePath}] ---> [${parentPath}], please check !`, config.log)
  }
  return flag
}

/**
 * message tip: load dependent module for parent
 * @param {String} modulePath
 * @param {String} parentPath the parasitifer moudle path
 * @param {Object} config
 * @param {String} remark
 */
const loadDependence = (modulePath, parentPath, config, remark = '') => {
  log.info(`load dependent ${remark} module: [${modulePath}] ---> [${parentPath}]`, config.log)
}

/**
 * message tip: process moudle
 * @param {String} modulePath
 * @param {String} parentPath the parasitifer moudle path
 * @param {Object} config
 * @param {String} remark
 */
const processModule = (modulePath, parentPath, config, remark = '') => {
  if (!path.isAbsolute(parentPath)) {
    parentPath = path.resolve(parentPath)
  }
  log.info(`process ${remark} moudle: [${modulePath}] ---> [${parentPath}]`, config.log)
}

module.exports = {
  checkExist,
  loadDependence,
  processModule,
  tryToVisit
}