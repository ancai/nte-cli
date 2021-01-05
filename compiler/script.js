const fs = require('fs')
const url = require('url')
const uglifyJS = require('uglify-js')

const log = require('../util/log')
const { hash } = require('../util/hash')
const msg = require('./message')
const seekPath = require('./seek')

/**
 * collect javascript code
 */
const scriptTagReg = /<script.*src=['"]((?!http|\/\/).*?)['"].*><\/script>/gmi
const scriptCodeReg = /<script>([\s\S]+?)<\/script>/gmi

/**
 * match body tag
 */
const BODY_REG = /<\/body>/

/**
 * bowlder lib regular expression
 */
const BOWLDER_LIB_REG = /bowlder.*?\.js/i


const buildSkinModule = (skins) => {
  let jsCode
  if (Reflect.ownKeys(skins).length) {
    jsCode = 'bowlder.define.skin('+ JSON.stringify(skins) +')'.replace(/[\r\n\t]/gm, '')
    jsCode += ';'
  }

  return jsCode || ''
}

const buildAliasMod = dep => {
  return `bowlder.define("${dep.aliasPath}", ${JSON.stringify(dep.alias)}),
    bowlder.run("${dep.aliasPath}").then(function(e) {
      bowlder.conf({
        alias: e
      })
    });`
}

/**
 * merge js moudles in different file
 * @param {Object} dep the instance of Dependency class
 * @param {Object} config ne.config.js json object
 *  
 */
const mergeJS = (dep, config) => {
  const { template, scriptSet, skins } = dep
  let jsCode = '', i = 0
  scriptSet.forEach(code => {
    if (!(/;[\s\t\r\n]*$/.test(code))) {
      code += ';' // make sure having the semicolon in the end of code block
    }
    jsCode += code + '\r\n' // avoid compressing error, append line break
    if (dep.bowlderIndex === i) {
      if (dep.aliasPath) { // the alias of module
        jsCode += buildAliasMod(dep)
      }
    }
    i++
  })
  jsCode += buildSkinModule(skins)
  const result = uglifyJS.minify(jsCode, {
    output: {
      ascii_only: true
    }
  })
  const { error, code } = result
  if (error) {
    const { message, line, col, pos } = error
    log.err(`"${message}" error occured when minifying js file, at line: ${line}, col: ${col}, pos: ${pos} `)
  } else {
    jsCode = code // compressed code
  }

  if (jsCode) {
    const {
      dir: {root, js}, jsFile, cdnPath
    } = config.output
    const accessPath = js + '/' + jsFile.replace(/\[hash\]/, hash(jsCode))
    fs.writeFileSync(root + '/' + accessPath, jsCode)
    const cdnUrl = url.resolve(cdnPath, config.upload.path + '/' + accessPath),
      destScriptTag = `\n<script src="${cdnUrl}"></script>\r\n`

    if (BODY_REG.test(dep.getCnt())) {
      // insert merged script at the end of body tag
      template.update(BODY_REG, destScriptTag + '</body>')
    } else { // without body end tag, appending merged script
      dep.update({codeStr: dep.getCnt() + destScriptTag})
    }
    log.ok(`compiled js file: [${cdnUrl}] ---> [${dep.getPath()}]`)
  } else {
    log.warn(`there aren't any compiled js files in: [${dep.getPath()}]`)
  }
  
  return dep
}

/**
 * extract js from html module or template
 * @param {Object} dep the instance of Dependency class
 * @param {Object} config 
 */
const extractJS = (dep, config) => {
  const { template: { codeStr, filePath }, scriptSet } = dep
  let arry, jsPath, jsCode
  // from a single js file
  // <script src="js/bowlder.js"></script>
  while ((arry = scriptTagReg.exec(codeStr))) {
    arry[1] = arry[1].replace(/^@/, '')
    jsPath = seekPath(arry[1], filePath, config)
    
    if (msg.checkExist(jsPath, filePath, config)) {
      msg.processModule(jsPath, filePath, config, 'js')
      jsCode = fs.readFileSync(jsPath, config.encoding)
      scriptSet.add(jsCode)

      if (dep.bowlderIndex === -1 && BOWLDER_LIB_REG.test(jsPath)) {
        dep.bowlderIndex = scriptSet.size
      }
    }
  }

  // from script tag inner js code
  //  <script>(()=>{...})</script>
  let resultAry = []
  while ((arry = scriptCodeReg.exec(codeStr))) {
    resultAry.push(arry[1])
  }
  if (resultAry.length > 0) {
    log.info(`collect inner code of script tag in template: [${filePath}]`, config.log)
    resultAry.forEach(jsCode => scriptSet.add(jsCode))
  }

  return dep
}

/**
 * remove script tag of relative quoted path
 * @param {Object} dep the instance of Dependency class
 * @param {Object} config
 */
const rmLocalScript = (dep, config) => {
  let { template } = dep, { filePath } = template
  if (template.needProc(scriptTagReg)) {
    log.info(`remove relative script tag in template: [${filePath}]`, config.log)
    template.update(scriptTagReg, '')
  }

  if (template.needProc(scriptCodeReg)) {
    log.info(`remove script tag inner code in template: [${filePath}]`, config.log)
    template.update(scriptCodeReg, '')
  }

  return dep
}

module.exports = {
  extractJS,
  mergeJS,
  rmLocalScript
}