const path = require('path')

const msg = require('./message')

const netPathReg = /^\/\//
const atMarkReg = /^@/

/**
 * try to find the valid path by different way
 * @param {String} modulePath 
 * @param {String} templatePath 
 * @param {*} config 
 */
const seekPath = (modulePath, templatePath, config) => {
  let filepath = modulePath
  // handle the path beginning with @, ex: ne-module="@../../../tabs/tabs.js"
  if (atMarkReg.test(modulePath)) {
    modulePath = modulePath.replace(atMarkReg, '')
  }

  // net path, ex: //temp.163.com/special/008097UL/index2017_friend_data_api.js
  if (!netPathReg.test(modulePath)) {
    if (path.isAbsolute(modulePath)) {
      // visit in absolute way
      filepath = config.svnRoot + modulePath
      msg.checkExist(filepath, templatePath, config)
    } else {
      // visit in a relative way, based on the template path
      filepath = path.resolve(templatePath, '../', modulePath)
      if (!msg.checkExist(filepath, templatePath, config)) {
        // visit in a relative way, based on the executive path
        filepath = path.resolve(modulePath)
        msg.tryToVisit(filepath, templatePath, config)
      }
    }
  }

  return filepath
}

module.exports = seekPath