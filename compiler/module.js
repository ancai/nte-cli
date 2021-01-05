const fs = require('fs')
const path = require('path')

const log = require('../util/log')
const { convertURL } = require('./url')
const msg = require('./message')
const seekPath = require('./seek')

/**
 * Module relevant regular expressions
 */
const moduleReg = /ne-(module|plugin|extend)=['"](@?[\w./-]+?)['"]/gm
const htmlModReg = /<[a-z]\w{2,10}.*ne-module=['"](@?[\w./-]+?)['"].*?>[\r\n\t\s]*<\//gm
const propsReg = /ne-props=["'](.*?)["'](\s|>)/g
const stateReg = /{{.*?props\..*?}}/g
const expReg = /{{(.*?)}}/g

/**
 * js AMD module
 */
const AMD_MOD_Reg = /define\([\r\n\t\s]*?\[/m
const AMD_MOD_Reg_2 = /define\([\r\n\t\s]*?(function|\[|\{)/m
const AMD_MOD_Reg_3 = /['"]@([\w/.]+?)['"]/gm

/**
 * unqualified AMD standard dependency
 */
const NOT_AMD_DI = /^!|(https?:)?\/\//

/**
 * moudle type regular expression
 */
const cssReg = /\.css$/i
const jsReg = /\.js$/i
const htmlReg = /\.html?$/i

/**
 * html and js file type
 */
const HTML_EXT = '.html'
const JS_EXT = '.js'

/**
 * invalid character regular expression
 */
const BLANK_REG = /[\n\r\t\s"']/g

/**
 * checking moudle type
 */
const isJS = modulePath => jsReg.test(modulePath)
const isCSS = modulePath => cssReg.test(modulePath)
const isHTML = modulePath => htmlReg.test(modulePath)

/**
 * AMD module ID ex: /products/util/tool.js
 * @param {String} modulePath
 * @param {Object} config
 */
const getModuleID = (modulePath, config) => {
  let moduleID
  modulePath = modulePath.replace(/\\/g, '/')
  // for instance config.svnRoot = 'd:/frontend'
  if (modulePath.includes(config.svnRoot)) {
    // modulePath = [d:/frontend/m/plugins/gesture.js] ---> moduleID = [/m/plugins/gesture.js]
    moduleID = modulePath.replace(config.svnRoot, '')
  } else {
    // modulePath = [d:/product/m/plugins/gesture.js] ---> moduleID = [/m/plugins/gesture.js]
    moduleID = modulePath.replace(/^[a-zA-Z]:/, '')
  }

  return moduleID
}

/**
 * define required module
 * @param {String} modulePath
 * @param {String} moudleCode
 * @param {Object} config
 */
const defineM = (modulePath, moudleCode, config) => {
  let codeStr = moudleCode
  const moduleID = getModuleID(modulePath, config)
  let reModPaths = []
  // seek dependent module paths which are quoted by current module
  const { depModPaths: modPaths, startIdx, endIdx } = findDI(codeStr, false, config)
  
  if (modPaths && modPaths.length && modPaths[0]) {
    modPaths.filter(depPath => depPath !== '').forEach(depPath => {
      if (NOT_AMD_DI.test(depPath) || isCSS(depPath) || isHTML(depPath)) { // not AMD standard moudle
        // remove unlinked dependency after injected one file
        // ex: <code>"!yixin.js", "https://img1.cache.netease.com/common/share/yixin/b02/yixin.css", "scroller.css"
        // </code>
        log.info(`remove dependency: [${depPath}] --×--> [${modulePath}]`, config.log)
      } else {
        // reserve valid path ["js/tools.js", "loginUtil",  "../../modules/ne2015/adtracker/sspAd.js"]
        // threrein, "loginUtil" is a alias of "/modules/ne2015/common-nav/utils/loginUtil.js"
        reModPaths.push(`"${depPath}"`)
      }
    })
  }

  if (startIdx > 0) {
    codeStr = codeStr.substring(0, startIdx) + reModPaths.join(',') + codeStr.substring(endIdx)
  }

  // for instance, <code>define(['%drag_plugin_depends'], function (drag) {...});</code>
  // turn into <code>bowlder.define("/news/liveshow_timeline/js/plugin/drag.js", ["%drag_plugin_depends"], function(drag) {...});</code>
  codeStr = codeStr.replace(AMD_MOD_Reg_2, (match, p1) => {
    return `bowlder.define("${moduleID}", ${p1}`
  })
  log.info(`complete AMD module: [${modulePath}]`, config.log)
  
  return codeStr
}

const defineSkin = (dep, modulePath, htmlCode, config) => {
  const moduleID = getModuleID(modulePath, config)
  dep.skins[moduleID] = `${htmlCode}`
  log.info(`complete skin module: [${moduleID}]`, config.log)
}

/**
 * link the packed ADM moudle
 * @param {String} modMatch like 'ne-module="modules/fixed_mod/fixed_mod.js"><' of regular express matched part
 * @param {String} modSrc the relative moudle path in template source code
 * @param {String} modAbsPath absolute moudle path ex: '/code/products/lottery/module/datahelper.js'
 * @param {Object} config
 */
const linkModule = (modMatch, modSrc, modAbsPath, config) => {
  let modPath = modMatch
  
  if (isJS(modSrc)) {
    modPath = modMatch.replace(modSrc, getModuleID(modAbsPath, config))
  }

  return modPath
}

/**
 * process the module which is not meet the AMD specification
 * ex: '!../../js/lib/raphael.js;../../js/lib/chart.core.js;../../js/lib/chart.frame.js'
 * @param {String} modulePath
 * @param {Object} dep the instance of Dependency class
 * @param {Object} config
 * @param {String} parentPath
 */
const notAMD = function(modulePath, dep, config, parentPath) {
  const { scriptSet, styleSet, asyncAssets } = dep
  let moduleCode = ''
  modulePath = modulePath.replace(/^!/, '').split(/;/)
  for (let i = 0, itemPath; i < modulePath.length; i++) {
    itemPath = modulePath[i]
    if (/(https?:)?\/\//.test(itemPath)) {
      asyncAssets.add(itemPath)
    } else {
      itemPath = seekPath(itemPath, parentPath, config)
      if (fs.existsSync(itemPath)) {
        moduleCode = fs.readFileSync(itemPath, config.encoding)
      }
    }

    if (isJS(itemPath)) {
      scriptSet.add(moduleCode)
      log.info(`complete ordinary js module: [${itemPath}]`, config.log)
    }
    if (isCSS(itemPath)) {
      styleSet.add(convertURL(moduleCode, itemPath, config))
      log.info(`complete ordinary css module: [${itemPath}]`, config.log)
    }
  }
  
  return dep
}

/**
 * seek dependent module path of 'codeStr'
 * @param {String} codeStr the instance of Dependency class
 * @param {Object} dep
 * @param {Object} config
 */
const findDI = (codeStr, dep, config) => {
  let depModPaths
  let startIdx = -1, endIdx = -1, ary
  if ((ary = AMD_MOD_Reg.exec(codeStr))) {
    startIdx = ary.index + ary[0].indexOf('[') + 1
    // the end position of dependent modules
    endIdx = codeStr.indexOf(']', startIdx)
  } else {
    dep && log.info(`the dependent AMD paths was not found in [${dep.getPath()}]!`, config.log)
  }
  // as follows, seek dependent path
  // define([
  //   '../../js/tools.js',
  //   '../../js/request.js',
  // ]......
  if (startIdx > 0) { // contain dependent moudle path
    depModPaths = codeStr.substring(startIdx, endIdx)
      .replace(BLANK_REG, '').split(/,/)
  }

  // replace the module of quoted by alias
  if (depModPaths && depModPaths.length) {
    depModPaths = depModPaths.filter(item => {
      let flag = true
      if (item === '') {
        flag = false
      }
      // project.json ---> "excludeAMD":{
      //   "http://img1.cache.netease.com/video/vod/h5/VODPlayer.js":1
      // }
      if (config.project && config.project.excludeAMD && config.project.excludeAMD[item]) {
        flag = false
      }
      return flag
    })
    // replace the module path quoted by alias
    if (dep && dep.alias) {
      depModPaths = depModPaths.map(item => dep.alias[item] ? dep.alias[item] : item)

    }
  }

  return { depModPaths, startIdx, endIdx }
}

/**
 * as follows, html module
 *    <div ne-props="focus:true;events:mouseover;interval:4000;" ne-module="modules/slide/slide.html" class="topnews_focus"></div>
 * slide.html
 *    <div ne-module="/modules/slide/slide.js" class="mod_focus" ne-class="{{props.focus ? 'foucs_wrap' : ''}}" 
 * ne-state="events={{props.events||'mouseover'}};interval={{props.interval||4000}}">
 * 
 * merged to 
 *    <div ne-module="" class="topnews_focus">
 *      <div ne-module="slide" class="mod_focus" ne-class="foucs_wrap" ne-state="events=mouseover;interval=4000">...
 * to sum up: removing ne-props, eval the ne-state
 * @param {String} htmlCode
 * @param {Object} dep the instance of Dependency class
 * @param {String} modulePath 
 * @param {Object} config
 * @param {Function} handleTemplate process template function
 */
const parseHtmlMod = (htmlCode, dep, modulePath, config, handleTemplate) => {
  const props = {}
  if (propsReg.test(htmlCode)) {
    htmlCode = htmlCode.replace(propsReg, (match, p1) => {
      p1.split(/;/).forEach(item => {
        const [key, val] = item.split(/:|=/).map(item => item.trim())
        if (key && val) {
          props[key] = val
        }
      })
      log.info(`extract ne-props: [${match}]`, config.log)
      return />$/.test(match) ? '>' : ''
    })
  }

  // according the skin prop to seek html module path
  // modules/shares/shares.html ---> modules/shares/shares.pop6x1.html
  if (props.skin) {
    modulePath = modulePath.replace(htmlReg, '.' + props.skin + HTML_EXT)
  }
  const child = handleTemplate(dep.recurse(modulePath), config)
  let childStr = child.getCnt()

  if (Reflect.ownKeys(props).length) {
    childStr = childStr.replace(stateReg, (match) => {
      log.info(`parse state param: ${match}`, config.log)
      return match.replace(expReg, (match, p1) => {
        return (new Function('props', `return ${p1}`))(props)
      })
    })
  }

  return `${htmlCode.substring(0, htmlCode.length - 2)}${childStr}</`
}

/**
 * parse bowlder js define module
 * @param {Object} dep the instance of Dependency class
 * @param {Object} config
 * @param {Function} handleTemplate process template function
 */
const addDep = (dep, config, handleTemplate) => {
  const { template, scriptSet } = dep, { codeStr, filePath } = template
  // parse module dependencies
  let arry, modPaths, depMod
  // for one case
  // usually in head part of js file
  // ex: <code>define(['../util/request.js','../util/modal.js','../util/tools.js']</code>
  modPaths = findDI(codeStr, dep, config)['depModPaths']
  if (modPaths && modPaths.length && modPaths[0]) {
    modPaths
      .filter(modPath => !(/^%\w+$/.test(modPath))) // inner define AMD module, ex: define('%drag_plugin_depends', {})
      .forEach(modPath => {
        if (NOT_AMD_DI.test(modPath) || !isJS(modPath)) { // not AMD standard moudle
          msg.loadDependence(modPath, filePath, config, 'ordinary')
          notAMD(modPath, dep, config, filePath)
        } else { // AMD module
          depMod = seekPath(modPath, filePath, config)
          if (depMod) {
            msg.loadDependence(depMod, filePath, config, 'AMD')
            addDep(dep.recurse(depMod), config, handleTemplate)
          }
        }
      })
  }

  // another case dynamic moudle
  // ex: <code>scope.schemeListUrl = '@../schemerelist/schemerelist.js'</code>
  let regResult
  arry = []
  while ((regResult = AMD_MOD_Reg_3.exec(codeStr))) {
    arry.push(regResult[1])
  }
  arry.forEach(modPath => {
    depMod = seekPath(modPath, filePath, config)
    
    // html dynamic moudle, same as skin
    depMod = depMod.replace(jsReg, HTML_EXT)
    if (fs.existsSync(depMod) && isHTML(depMod)) {
      msg.loadDependence(depMod, filePath, config, 'dynamic skin')
      const skinCode = handleTemplate(dep.recurse(depMod), config).getCnt()
      defineSkin(dep, depMod, skinCode, config)
    }

    // js dynamic moudle
    depMod = depMod.replace(htmlReg, JS_EXT)
    if (fs.existsSync(depMod) && isJS(depMod)) {
      msg.loadDependence(depMod, filePath, config, 'dynamic AMD')
      addDep(dep.recurse(depMod), config, handleTemplate)
    }
  })

  // collect  required script module
  if (isJS(filePath)) {
    scriptSet.add(defineM(filePath, codeStr, config))
  }
  return dep
}

/**
 * parse ne-module directive
 * @param {Object} dep the instance of Dependency class
 * @param {Object} config
 * @param {Function} handleTemplate process template function
 */
const parseMod = (dep, config, handleTemplate) => {
  const { template } = dep, { filePath } = template
  let modulePath, linkedMatch

  // ne-(module|plugin|extend)='modules/house/house.js'
  if (template.needProc(moduleReg)) {
    template.update(moduleReg, (match, p1, p2) => {
      modulePath = seekPath(dep.alias[p2] || p2, filePath, config)
      // js module
      modulePath = modulePath.replace(htmlReg, JS_EXT)
      if (fs.existsSync(modulePath)) {
        msg.processModule(modulePath, filePath, config, 'js')
        addDep(dep.recurse(modulePath), config, handleTemplate)
        linkedMatch = linkModule(match, p2, modulePath, config)
      } else {
        linkedMatch = match
      }
      // ne-moudle is linked to the packed ADM moudle in template
      return linkedMatch
    })
  }

  // ne-module="modules/bottomfocus/bottomfocus.html">
  if (template.needProc(htmlModReg)) {
    template.update(htmlModReg, (match, p1) => {
      modulePath = seekPath(dep.alias[p1] || p1, filePath, config)
      if (isHTML(p1)) {
        log.info(`remove html module path: [${p1}] --×--> [${filePath}]`, config.log)
        match = match.replace(p1, '')
      }
      // html module
      modulePath = modulePath.replace(jsReg, HTML_EXT)
      if (fs.existsSync(modulePath)) {
        msg.processModule(modulePath, filePath, config, 'html')
        match = parseHtmlMod(match, dep, modulePath, config, handleTemplate)
      }

      // ne-module is linked to the packed ADM module in template
      return match
    })
  }

  return dep
}

/**
 * handle pattern paths in project.json file
 * @param {string[]} paths 
 * @param {string[]} pathSet
 */
const handlePatternPath = (paths = [], pathSet) => {
  if (paths.length === 0) return
  paths.forEach(itemPath => {
    if (/\*/.test(itemPath)) {
      let basePath = ''
      itemPath.split(/\//).forEach((segPart, index, itemAry) => {
        const remainPath = itemAry.slice(index + 1).join('/')
        if (segPart === '*') {
          const childList = fs.readdirSync(basePath)
          // iteration process for directory
          handlePatternPath(childList.filter(item => !/\.\w+/.test(item)).map(item => basePath + item + '/' + remainPath), pathSet)
        } else if (/\*.(html|js|css)$/.test(segPart)) {
          const childList = fs.existsSync(basePath) ? fs.readdirSync(basePath).map(item => basePath + item) : []
          childList.forEach(childPath => {
            if (isJS(childPath) || isCSS(childPath) || isHTML(childPath)) {
              pathSet.add(childPath)
            }
          })
        } else {
          basePath += segPart + '/'
        }
      })
    } else if (isJS(itemPath) || isCSS(itemPath) || isHTML(itemPath)) {
      pathSet.add(itemPath)
    }
  })
}

/*
* parse extend modules in 'project.json' file
* @param {Object} dep the instance of Dependency class
* @param {Object} config
* @param {Function} handleTemplate process template function
*/
const parseExtend = (dep, config, handleTemplate) => {
  const { template } = dep, { filePath, codeStr } = template
  let modulePath
  // dependent modules in project.json file
  if (config.project && config.project.depends) {
    const { base } = path.parse(filePath),
      modPaths = config.project.depends[base]
      excludePaths = config.project.dependsExclude && config.project.dependsExclude[base]
    // project.json file path as reference for dependent assets
    const referPath = path.resolve('./project.json')
    const pathSet = new Set(), excludePathSet = new Set()
    if (modPaths) {
      handlePatternPath(modPaths.split(/\||\s+/), pathSet)
    }
    if (excludePaths) {
      handlePatternPath(excludePaths.split(/\||\s+/), excludePathSet)
    }
    const extReg = /\.\w{2,4}$/, excludePathAry = [...excludePathSet].map(item => item.replace(extReg, ''))
    if (pathSet.size > 0) {
      pathSet.forEach(item => {
        modulePath = seekPath(item, referPath, config)
        // not in exclude dependent paths and existence 
        if (!excludePathAry.includes(item.replace(extReg, '')) && fs.existsSync(modulePath)) {
          if (isHTML(modulePath)) {
            msg.loadDependence(modulePath, referPath, config, 'dynamic skin')
            const skinCode = handleTemplate(dep.recurse(modulePath), config).getCnt()
            defineSkin(dep, modulePath, skinCode, config)
          }
          if (isJS(modulePath)) {
            msg.loadDependence(modulePath, referPath, config, 'js module')
            addDep(dep.recurse(modulePath), config, handleTemplate)
          }
        }
      })
      // reset the property of filePath from  child value to main entry template
      dep.update({filePath, codeStr})
    }
  }
}

exports.extractModule = parseMod
exports.extractExtend = parseExtend
exports.getModuleID = getModuleID
