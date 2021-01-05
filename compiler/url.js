const fs = require('fs')
const path = require('path')

const log = require('../util/log')
const msg = require('./message')
const seekPath = require('./seek')

const URL_REG = /url\(['"]?([\w./?-]+?)['"]?\)/gm
const SRC_REG = /\ssrc=['"]?([\w./?-]+?\.\w{2,5})['"]?/gm

/**
 * script and style file could be processed individually
 */
const EXCLUDED_REG = /\.(js|css|html)/i
const HTTP_REG = /^http|^\/{2}?/i

/**
 * max length of url
 */
const URL_MAX_LEN = 100

/**
 * whether is image resource
 * @param {String} url 
 */
const isImage = url => /\.(png|jpe?g|bmp|gif|svg)$/i.test(url)

/**
 * Check if the path is ignored
 * @param {String} assetPath
 */
const isIgnored = assetPath => {
  return EXCLUDED_REG.test(assetPath) ||
    HTTP_REG.test(assetPath)
}

/**
 * get image base64 url
 * @param {String} srcPath image path referenced by source code
 */
const toBase64 = (srcPath) => {
  let base64URL

  const imageExt = path.parse(srcPath).ext
  const imageData = fs.readFileSync(srcPath)
  base64URL = `data:image/${imageExt.substring(1)};base64,`+ imageData.toString('base64')

  return base64URL
}

/**
 *  get absolute path of local relative image
 */
const toAbs = (srcPath, config) => {
  let absURL, destPath, imageName
  const { output: {cdnPath, dir}, upload: {path: upPath} } = config

  imageName = path.parse(srcPath).base
  destPath = path.join(dir.root, isImage(srcPath) ? dir.image : dir.others, imageName)
  
  if (!fs.existsSync(destPath)) {
    // cpy img file from source code dir to the dest
    fs.copyFileSync(srcPath, destPath)
  }
  absURL = cdnPath + upPath + '/' + dir.image + '/' + imageName

  return absURL
}

/**
 * get converted url
 * @param {String} assetPath 
 * @param {String} parentPath 
 * @param {String} config 
 */
const getURL = (assetPath, parentPath, config) => {
  let url = assetPath
  const srcPath = seekPath(assetPath.replace(/\?(.*)$/, ''), parentPath, config)
  if (msg.checkExist(srcPath, parentPath, config)) {
    const { size } = fs.statSync(srcPath)
    if (size < config.image.base64 && isImage(srcPath)) {
      url = toBase64(srcPath)
    } else {
      url = toAbs(srcPath, config)
    }
  }
  
  return url
}

/**
 * convert local relative path to absolute or base64 form
 * @param {String} code 
 * @param {String} parentPath 
 * @param {Object} config 
 */
const convertURL = (code, parentPath, config) => {
  let url, sum = 0
  const record = {}

  // url case
  // <code>background: url("../images/index_sprites.png")</code>
  // <code>src: url('Sansation_Bold.ttf')</code>
  // convert into
  // <code>background: url("https://static.ws.126.net/163/f2e/${project}/images/index_sprites.png")</code>
  // <code>background: url("https://static.ws.126.net/163/f2e/${project}/images/Sansation_Bold.ttf")</code>
  // or
  // <code>background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg......")</code>
  code = code.replace(URL_REG, (match, p1) => {
    if (isIgnored(p1)) {
      fs.writeFileSync('./log.txt', `{${p1}, ${match}}`, {flag: 'a'})
      return match
    } else {
      url = record[p1] = getURL(p1, parentPath, config)
      return `url('${url}')`
    }
  })

  // src case
  // <code><img src="images/index_side_unlogin.jpg"></code>
  // convert into
  // <code><img src="https://static.ws.126.net/163/f2e/${project}/images/index_side_unlogin.jpg"></code>
  // <code><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA......"></code>
  code = code.replace(SRC_REG, (match, p1) => {
    if (isIgnored(p1)) {
      return match
    } else {
      url = record[p1] = getURL(p1, parentPath, config)
      return ` src="${url}"`
    }
  })

  for (const [key, val] of Object.entries(record)) {
    log.info(`replace relative url: [${key}] ---> [${val.substring(0, URL_MAX_LEN)}]`, config.log)
  }
  sum = Reflect.ownKeys(record).length
  if (sum > 0) {
    log.info(`as shown above, [${sum}] url were replaced in: [${parentPath}]`, config.log)
  }

  return code
}

module.exports = {
  convertURL
}
