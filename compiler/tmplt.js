const fs = require('fs')
const path = require('path')

const log = require('../util/log')
const { extractJS, mergeJS, rmLocalScript } = require('./script')
const { extractCSS, mergeCSS, rmLocalCSS } = require('./style')
const { extractModule, extractExtend } = require('./module')
const { convertURL } = require('./url')
const Dependency = require('./dep')
const { parseInc } = require('./inc')
let config

/**
 * remove empty row
 * @param {Object} dep the instance of Dependency class
 */
const clearBlank = dep => {
  const { template } = dep
  template.update(/\n{2,}/gm, '\n')
  return dep
}

/**
 * process template
 * @param {Object} dep the instance of Dependency class
 * @param {Object} config
 */
const handleTemplate = (dep, config) => {
  log.info(`process html template: [${dep.getPath()}]`, config.log)

  // process style
  extractCSS(dep, config)
  rmLocalCSS(dep, config)

  // process script
  extractJS(dep, config)
  rmLocalScript(dep, config)

  // process moudle
  extractModule(dep, config, handleTemplate)

  return dep
}

/**
 * analysis module parses HTML files and generates DOM node tree
 * @param {String} filePath 
 */
const analysis = async filePath => {
  const start = Date.now()
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(filePath)
  }
  const dep = new Dependency(filePath, config)
  const outputPath = config.output.dir.root +'/' + path.parse(filePath)['base']
  log.info(`analyze entry file: [${filePath}]`)
  // process inc fragment
  parseInc(dep, config)
  dep.update({filePath}) // reset the property of filePath from  child value to main entry template
  
  // dependency injected modules (ne-module|plugin|extend...)
  handleTemplate(dep, config)
  dep.update({filePath})

  // process extend modules in project.json
  extractExtend(dep, config, handleTemplate)

  // load remote assets
  if (dep.asyncAssets.size > 0) {
    const urls = await dep.loadRemote()
    log.info(`load remote assets: [${urls.join(';')}]`, config.log)
  }

  // merge style assets
  mergeCSS(dep, config)

  // merge script assets
  mergeJS(dep, config)
  
  // replace all relative url
  const codeStr = convertURL(dep.getCnt(), dep.getPath(), config)
  dep.update({codeStr})

  // compiled template file in dist dir
  clearBlank(dep)

  // output builded template code content to dest dir
  fs.writeFileSync(outputPath, dep.getCnt(), config.encoding)
  log.ok(`create a compiled template file：[${path.resolve(outputPath)}], and the building process takes: ${Date.now() - start} ms.`)
}

/**
 * scan configed path to get entry html files 
 * @param {String} path dir or file path
 */
const scan = path => {
  const regFile = /\*.(s)?htm(l)?$/
  if (regFile.test(path)) {
    path = path.replace(regFile, '') || './'
    fs.readdirSync(path).filter(file => /\.(s)?htm(l)?/.test(file))
      .forEach(file => analysis(path + file))
  } else {
    analysis(path)
  }
}

module.exports = (conf) => {
  config = conf
  const { entry } = config
  config.svnRoot = config.svnRoot.replace(/\\/g, '/')

  if (Array.isArray(entry)) {
    entry.forEach(path => scan(path))
  } else if (typeof entry === 'string') {
    scan(entry)
  } else {
    log.err('illegal setting of [entry] value, please check !')
  }
}
