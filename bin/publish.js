const path = require('path')
const fs = require('fs')

const iconv = require('iconv-lite')

const log = require('../util/log')
const lang = require('../util/lang')
const agent = require('../util/agent')
const { CONFIG_NAME } = require('../constant/global')
const defaultConfig = require('../constant/default')

const HTML_REG = /\.s?html?/i
const CMS_ID_REG = /<meta\s+name=["']cms_id["']\s+content=["'](\w+)["']\s*\/?>/i
const RESULT_OK_REG = /<url>(.*)<\/url>/

/**
 * encoding character
 * @param {String} content
 * @param {String} charset default GBK
 */
function encodeStr(content, charset = 'GBK') {
  const buf = iconv.encode(content, charset)
  let str = ''
  let ch = '', i
  for (i = 0; i < buf.length; i++) {
    ch = buf[i].toString('16')
    if (ch.length === 1) {
      ch = '0' + ch
    }
    str += '%' + ch
  }

  return str.toUpperCase()
}

/**
 * update CMS template
 * @param {String} modelid 
 * @param {String | Buffer} content 
 * @param {Object} config
 * @param {Function} callback
 */
const updateTemplate = (modelid, content, config, callback) => {
  const { url, params } = config.api.cms.pc
  const data = params + '&modelid=' + modelid + '&content=' + encodeStr(content)

  return new Promise((resolve, reject) => {
    agent.post(url)
      .type('form')
      .send(data)
      .end(resp => RESULT_OK_REG.test(resp.text) ? resolve(resp.text) : reject(resp))
  })
}

const publish = (config) => {
  const { root } = config.output.dir
  fs.readdirSync(root).forEach(filepath => {
    if (HTML_REG.test(filepath)) {
      let content = fs.readFileSync(root + '/' + filepath, config.encoding)
      if (CMS_ID_REG.test(content)) {
        const cmsID = CMS_ID_REG.exec(content)[1]
        content = content.replace(CMS_ID_REG, '')

        updateTemplate(cmsID, content, config)
          .then(msg => {
            const url = RESULT_OK_REG.exec(msg)[1]
            log.ok(`publish successfully: [${path.resolve(filepath)}] ---> [${url}]`)
          })
          .catch(resp => log.err(`the failure to publish for [${path.resolve(filepath)}]: \n ${resp.text}`))
      } else {
        log.info(`cmsid not found, ignore file: [${filepath}]`, config.log)
      }
    }
  })
}

module.exports = () => {
  const configPath = path.resolve(CONFIG_NAME)
  if (fs.existsSync(configPath)) {
    let config = lang.mergeJSON(defaultConfig, require(configPath))
    publish(config)
  } else {
    log.err('No configuration file exists.')
    log.err('please execute the "nte-cli init" command')
  }
}
