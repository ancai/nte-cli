const os = require('os')
const fs = require('fs')

const agent = require('../util/agent')
const log = require('../util/log')
const fo = require('../util/fo')
const pkg = require('../package.json')

/**
 * the frequence of checking
 */
const checkInterval =  60 * 60 * 1000 // default 1 hour

const checkUpdate = (updater, logFile) => {
  agent.get('https://registry.npmjs.org/nte-cli/')
    .end(resp => {
      const pkgInfo = resp.toJSON()
      const remoteVersion = pkgInfo['dist-tags']['latest']
      if (pkg.version !== remoteVersion) {
        log.info('\n------------------------------------------------')
        log.warn(`\nPackage update available: [${pkg.version}] ---> [${remoteVersion}]`)
        log.ok(`\nRun [ npm i -g ${pkg.name} ] to update.`)
        log.info('\n------------------------------------------------')
      }

      updater.lastCheck = Date.now()
      fo.writeJSON(updater, logFile)
    })
}

module.exports = () => {
  let updater
  const logFile = os.tmpdir() + '/check_update.json'
  if (fs.existsSync(logFile)) {
    updater = require(logFile)
  } else {
    updater = { lastCheck: Date.now() }
    fo.writeJSON(updater, logFile)
  }

  if (Date.now() - updater.lastCheck > checkInterval) {
    checkUpdate(updater, logFile)
  }
}