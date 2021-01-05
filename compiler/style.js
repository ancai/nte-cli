const fs = require('fs')
const url = require('url')

const log = require('../util/log')
const { hash } = require('../util/hash')
const { convertURL } = require('./url')
const msg = require('./message')
const seekPath = require('./seek')

/**
 * css link tag regular expressions
 */
const linkReg = /<link.*href=['"]((?!http|\/\/).*?\.css)['"].*>/gm

/**
 * style tag regular expressions
 */
const styleReg = /<style>([\s\S]+?)<\/style>/gmi

/**
 * dependent css file
 */
const dependentReg = /@import\s+['"]((?!http|\/\/).*?)['"];?/gmi

/**
 * remove space tab return  and newline
 */
const blankReg = /[\r\n\t]/gm

/**
 * mathch head tag
 */
const HEAD_REG = /<\/head>/

/**
 * remove local dev host
 */
const DEV_HOST_REG = /http:\/\/dev\.f2e\.163\.com/gi

/**
 * load dependent css moudle
 * ex: <code>@import "common/common.css";</code>
 * @param {String} cssCode 
 * @param {String} parentPath 
 * @param {Object} config 
 */
const loadDependent = (cssCode, parentPath, config) => {
  let arry = [], result, importPath
  while((result = dependentReg.exec(cssCode))) {
    arry.push(result[1])
  }
  arry.forEach(importURL => {
    importPath = seekPath(importURL, parentPath, config)
    if (msg.checkExist(importPath, parentPath, config)) {
      msg.loadDependence(importPath, parentPath, config, '.css')
      const dependentCode = loadDependent(fs.readFileSync(importPath, config.encoding), importPath, config)
      cssCode = dependentCode + cssCode
    }
  })

  // remove local dependent url 
  cssCode.replace(dependentReg, '')

  return cssCode
}

/**
 * merge css moudles in different file
 * @param {Object} dep the instance of Dependency class
 * @param {Object} config ne.config.js json object
 */
const mergeCSS = (dep, config) => {
  const { template, styleSet } = dep
  let cssCode = ''
  styleSet.forEach(item => {
    if (item) cssCode += item
  })
  cssCode = cssCode
    .replace(/\s*[{}:;]\s*/gm, match => match.trim()) // remove space character
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove comment code
    .replace(blankReg, '') // remove line-break

  if (cssCode) {
    const {
      dir: {root, css}, cssFile, cdnPath
    } = config.output
    const accessPath = css + '/' + cssFile.replace(/\[hash\]/, hash(cssCode))
    fs.writeFileSync(root + '/' + accessPath, cssCode)
    // create link tag of cdn path
    const cdnUrl = url.resolve(cdnPath, config.upload.path + '/' + accessPath),
      destStyleTag = `\t<link rel="stylesheet" href="${cdnUrl}">\r\n`
    if (HEAD_REG.test(dep.getCnt())) {
      // insert merged script at the end of head tag
      template.update(HEAD_REG, destStyleTag + '</head>')
    } else { // without body end tag, appending merged style
      dep.update({codeStr: destStyleTag + dep.getCnt()})
    }
    log.ok(`compiled css file: [${cdnUrl}] ---> [${dep.getPath()}]`)
  } else {
    log.warn(`there aren't any compiled css files in: [${dep.getPath()}]`)
  }

  return dep
}

/**
 * extract style from html mouldle or template
 * @param {Object} dep the instance of Dependency class
 * @param {Object} config ne.config.js json object
 */
const extractCSS = (dep, config) => {
  let { template: { codeStr, filePath }, styleSet } = dep
  let arry, cssPath, cssCode

  // from link tag
  // <link rel="stylesheet" href="@datahelper.css">
  while ((arry = linkReg.exec(codeStr))) {
    arry[1] = arry[1].replace(/^@/, '')
    cssPath = seekPath(arry[1], filePath, config)
    if (msg.checkExist(cssPath, filePath, config)) {
      // handle css rule
      // replace relative path static assets
      msg.processModule(cssPath, filePath, config, 'css')
      cssCode = fs.readFileSync(cssPath, config.encoding)
      cssCode = cssCode.replace(DEV_HOST_REG, '')
      cssCode = loadDependent(cssCode, cssPath, config)
      styleSet.add(convertURL(cssCode, cssPath, config))
    }
  }

  // from style tag
  // <style>.main {...}</style>
  let resultAry = []
  while ((arry = styleReg.exec(codeStr))) {
    resultAry.push(arry[1])
  }
  if (resultAry.length > 0) {
    log.info(`collect inner code of style tag in template: [${filePath}]`, config.log)
    resultAry.forEach(cssCode => {
      cssCode = cssCode.replace(DEV_HOST_REG, '')
      styleSet.add(convertURL(cssCode, filePath, config))
    })
  }

  return dep
}

/**
 * remove relative 'link' tag path
 * remove style tag
 * @param {Object} dep the instance of Dependency class
 * @param {Object} config ne.config.js json object
 */
const rmLocalCSS = (dep, config) => {
  let { template } = dep, { filePath } = template
  
  if (template.needProc(linkReg)) {
    log.info(`remove relative link tag in template: [${filePath}]`, config.log)
    template.update(linkReg, '')
  }

  if (template.needProc(styleReg)) {
    log.info(`remove style tag in template: [${filePath}]`, config.log)
    template.update(styleReg, '')
  }

  return dep
}

module.exports = {
  extractCSS,
  mergeCSS,
  rmLocalCSS
}