const fs = require('fs')

const seekPath = require('./seek')
const { filterInc } = require('./inc')
const agent = require('../util/agent')
const mimeTypes = require('../constant/mime')
const { getModuleID } = require('./module')

/**
 * regular expression for removing new line remark
 */

class Template {
  
  constructor (filePath, codeStr) {
    /**
     * the path of module or template
     */
    this.filePath = filePath

    /**
     * the content of processed template or module
     */
    this.codeStr = codeStr
  }

  setProp (data) {
    Object.assign(this, data)
    return this
  }

  /**
   * update the character content of template
   * @param {RegExp} regExp
   * @param {Function | String} fn replace handler
   */
  update (regExp, fn) {
    this.codeStr = this.codeStr.replace(regExp, fn)
    return this
  }

  /**
   * checking need to process template
   * @param {RegExp} regExp 
   */
  needProc (regExp) {
    return regExp.test(this.codeStr)
  }
}

/**
 * if the template contains 'ne-alias' useage, we extract the path and content of alias
 * @param {String} codeStr 
 * @param {String} templatePath 
 * @param {Object} config 
 */
const getAilas = (codeStr, templatePath, config) => {
  let alias, aliasPath, result
  const regExp = /ne-alias=["']([/\w.]+)["']/g
  let match, aliasStr, aliasFilePath
  if ((match = regExp.exec(codeStr))) {
    aliasPath = match[1]
    aliasFilePath = seekPath(aliasPath, templatePath, config)
    aliasStr = fs.readFileSync(aliasFilePath, config.encoding)
    aliasStr = aliasStr.substring(aliasStr.lastIndexOf('{'), aliasStr.lastIndexOf('}')+1)
    alias = (new Function(`return ${aliasStr}`)())
  }

  // check whether the inc contains 'ne-alias'
  if (!aliasPath) {
    filterInc(codeStr, templatePath, config, (incCnt, incPath) => {
      if (regExp.test(incCnt)) {
        result = getAilas(incCnt, incPath, config)
      }
    })
  } else {
    aliasPath = getModuleID(aliasFilePath, config)
  }

  return result || [alias, aliasPath]
}

/**
 * get remote dependent code
 * @param {String} url
 * @param {Object} Dependency
 */
const getAsyncCode = function(url, dep) {
  let mimeType
  const extName = /\.\w+$/.exec(url)[0]
  
  if (extName) {
    mimeType = mimeTypes[extName]
  }
  return new Promise((resolve, reject) => {   
    agent.get(url)
      .set({'Content-Type': mimeType})
      .end(resp => {
        if (resp.isOK) {
          if (/\.js$/.test(url)) dep.scriptSet.add(resp.text)
          if (/\.css$/.test(url)) dep.styleSet.add(resp.text)
          resolve(url)
        } else {
          reject(resp.error)
        }
      })
  })
}

class Dependency {
  
  /**
   * the dependency of building
   * @param {String} filePath
   * @param {Object} config
   */
  constructor (filePath, config) {
    /**
     * the encoding of moudle or template character content
     */
    this.encoding = config.encoding

    /**
     * the code template
     */
    const codeStr = fs.readFileSync(filePath, this.encoding)
    this.template = new Template(filePath, codeStr)

    /**
     * the style asset of dependent by template or module 
     */
    this.styleSet = new Set()

    /**
     * the script asset of dependent by template or module 
     */
    this.scriptSet = new Set()

    /**
     * the alias map of some assets
     */
    const ary = getAilas(codeStr, filePath, config)
    this.alias = ary[0] || {}
    this.aliasPath = ary[1]


    /**
     * the index of bowlder library of quoted
     */
    this.bowlderIndex = -1

    /**
     * some assets as "http://static.ws.126.net/common/share/yixin/b02/yixin.css" need load remote url
     */
    this.asyncAssets = new Set()

    // the skin modules
    // bowlder.define.skin ({
    //  "/news/liveshow_timeline/js/module/shares/shares.html": '\n<ul class="ne-shares">\n <li class="share-yixin">\n  <a ne-click="share(\'yixin\')" titl......',
    //  "/news/liveshow_timeline/js/module/video/video.html": '<div class="video">\n    <div class="video-desc" style="display: none">\n......',
    //  "/news/liveshow_timeline/js/module/album/album.html": '<div class="live-album">\n    <div  class="live-album-content" >\n......' 
    //})
    this.skins = {}
  }

  /**
   * recurse the child level module
   * @param {String} filePath module or template path
   */
  recurse (filePath) {
    let codeStr = fs.readFileSync(filePath, this.encoding)
    this.template.setProp({filePath, codeStr})
    return this
  }

  /**
   * set property of template Class
   * @param {String} codeStr 
   */
  update (props) {
    this.template.setProp(props)
  }

  /**
   * get content of template or module
   */
  getCnt () {
    return this.template.codeStr
  }

  /**
   * get file path of template or module
   */
  getPath () {
    return this.template.filePath
  }

  /**
   * load remote out assets
   */
  loadRemote () {
    const ary = []
    this.asyncAssets.forEach(url => ary.push(url))
    const promises = ary.map(url => {
      return getAsyncCode(url, this)
    })
    return Promise.all(promises)
  }

}

module.exports = Dependency
