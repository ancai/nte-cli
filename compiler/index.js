const fs = require('fs')
const path =require('path')

const template = require('./tmplt')
const log = require('../util/log')
const fo = require('../util/fo')

const makeDistDir = config => {
  const {
    dir: {root, js, css, image, others},
    clean
  } = config.output
  const jsDir = root + '/' + js,
    cssDir = root + '/' + css,
    imgDir = root + '/' + image,
    othersDir = root + '/' + others
  const absDir = path.resolve(root)
  if (fs.existsSync(root) && clean) {
    fo.recurRemove(root)
    log.ok(`clean dist directory: [${absDir}]`)
  }
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root)
  }
  if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir)
  }
  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir)
  }
  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir)
  }
  if (!fs.existsSync(othersDir)) {
    fs.mkdirSync(othersDir)
  }
  log.ok(`create dist directory: [${absDir}]`)
}

const readProjectConfig = (config) => {
  const configPath = path.resolve('./project.json')
  log.info(`read config of the current project: [${configPath}]`, config.log)
  if (fs.existsSync(configPath)) {
    try {
      config.project = require(configPath)
    } catch (error) {
      log.warn(`[${configPath}] is not a valid json file!`, config.log)
      const jsonCnt = fs.readFileSync(configPath, config.encoding)
      config.project = JSON.parse(jsonCnt.replace(/[\r\n\t\s]/g, '').replace(/\\/g, '|'))
    }
  }
}

module.exports = (config) => {
  makeDistDir(config)
  readProjectConfig(config)
  template(config)
}