const path = require('path')
const fs = require('fs')

const { CONFIG_NAME } = require('../constant/global')
const log = require('../util/log')

const CONFIG_FILE = path.resolve(__dirname, `../template/${CONFIG_NAME}`)
const FRONT_SVN_REG = /.*[/\\]frontend/

/**
 * initialize config
 */ 
module.exports = () => {
  const executePath = path.resolve('.')
  let svnRoot = ''
  let configCnt = fs.readFileSync(CONFIG_FILE, 'UTF-8')
  configCnt = configCnt.replace('{{project_name}}', path.basename(executePath) || 'web')

  // get svn root path
  if (FRONT_SVN_REG.test(executePath)) {
    svnRoot = FRONT_SVN_REG.exec(executePath)[0].replace(/\\/, '/')
  }
  configCnt = configCnt.replace('{{svn_root}}', svnRoot)
  fs.writeFile(`./${CONFIG_NAME}`, configCnt, err => {
    if (err) log.err(err)
    log.ok(`create a config file: [${path.resolve(CONFIG_NAME)}]`)
  })
}
