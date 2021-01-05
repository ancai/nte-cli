const fs = require('fs')
const log = require('../util/log')
const msg = require('./message')
const seekPath = require('./seek')

/**
 * parse server side inluding code
 */
const VIRTUAL_INC_REG = /<!--#include\s+virtual=["']([\w/.-]+)["']\s*?-->/g
const CMS_ID_REG = /<meta\s+name=["']cms_id["']\s+content=["'](\w+)["']\s*\/?>/i
const SSI_INC_REG = /^\/special/i
const FILE_INC_REG = /<!--#include\s+file=["']([\w/.]+)["']\s*?-->/g

/**
 * parse local including snippet of code
 * <code><!--#include virtual="/news/common2015/channel_nav.html"--></code>
 *      to
 * <code><!--#include virtual="/special/sp/ntes_channelnav_2015.html"--></code>
 * <code>
 *  <!--#include file="htmls/topnav.html"--> to
 * </code>
 * @param {Object} dep the instance of Dependency class
 * @param {Object} config
 */
const parseInc = (dep, config) => {
  const { template } = dep, { filePath } = template
  let incCnt, incPath
  template.update(VIRTUAL_INC_REG, (match, p1) => {
    let ssiPath
    if (SSI_INC_REG.test(p1)) {
      ssiPath = p1
    } else {
      incPath = seekPath(p1, filePath, config)
      if (fs.existsSync(incPath)) {
        incCnt = fs.readFileSync(incPath, config.encoding)
      }
      if (CMS_ID_REG.test(incCnt)) {
        ssiPath = '/special/sp/' + incCnt.match(CMS_ID_REG)[1].replace(/^\d{4}/, '') +'.html'
        log.info(`replace local inc: [${p1}] ---> SSI: [${ssiPath}]`, config.log)
      } else {
        log.warn(`not found meta tag of setting cms_id in in [${match}]`)
        ssiPath = p1
      }
    }

    return ssiPath !== p1 ? match.replace(p1, ssiPath) : match 
  })

  if (FILE_INC_REG.test(dep.getCnt())) {
    template.update(FILE_INC_REG, (match, p1) => {
      incPath = seekPath(p1, filePath, config)
      // process one inc which is inclueded by the other
      const child = parseInc(dep.recurse(incPath), config)
      return child.getCnt()
    })
  }

  return dep
}

/**
 * handle the inc fragment in the template
 * @param {String} templateCode
 * @param {String} templatePath
 * @param {Object} config
 * @param {Function} callback
 */
const filterInc = (templateCode, templatePath, config, callback) => {
  let ary
  let incCnt, incPath, p1
  while ((ary = VIRTUAL_INC_REG.exec(templateCode))) {
    p1 = ary[1]
    if (!SSI_INC_REG.test(p1)) {
      incPath = seekPath(p1, templatePath, config)
      if (msg.checkExist(incPath, templatePath, config)) {
        incCnt = fs.readFileSync(incPath, config.encoding)
        callback(incCnt, incPath)
      }
    }
  }
}

module.exports = {parseInc, filterInc}