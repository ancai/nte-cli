const iconv = require('iconv-lite')

const defaultConfig = require('../constant/default')
const agent = require('../util/agent')

/**
 * encoding character
 * @param {Buffer} cntBuffer 
 * @param {String} charset default GBK
 */
function encodeStr(cntBuffer, charset = 'GBK') {
  const buf = iconv.encode(cntBuffer, charset)
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
 * get CMS template content by cmsModelId
 * @param {String} id ex: 0025f2e_building_test
 * @param {Object} config 
 */
/* eslint-disable */
const getTemplate = (id, config) => {
  let { url } = config.api.cms.pc
  url += '?target=internal&forward=model&method=getModelData&modelid=' + id
  agent.get(url)
    .end(resp => {
      console.log('\n get template content: \n')
      console.log(resp.text)
    })
}

/**
 * create CMS template, only supporting some special column
 * @param {Object} option
 * @param {Object} config 
 */
const createTemplate = ({extname = '.html', topicid, modelid, modelname, content}, config) => {
  const { url, params } = config.api.cms.pc
  const data = params + `&extname=${extname}&topicid=${topicid}&modelid=${modelid}&modelname=${encodeStr(modelname)}&content=${encodeStr(content)}`
  agent.post(url)
    .type('form')
    .send(data)
    .end(resp => {
      console.log('\n create template: \n')
      console.log(resp.text)
    })
}

/**
 * update CMS template
 * @param {String} modelid 
 * @param {String | Buffer} content 
 * @param {Object} config 
 * @param {*} callback 
 */
const updateTemplate = (modelid, content, config, callback) => {
  const { url, params } = config.api.cms.pc
  const data = params + '&modelid=' + modelid + '&content=' + encodeStr(content)
  agent.post(url)
    .type('form')
    .send(data)
    .end(resp => {
      console.log('\n update template: \n')
      console.log(resp.text)
    })
}

const config = defaultConfig

getTemplate('0025f2e_building_test', config)

createTemplate({topicid: '00254SDF', modelid: '0025f2e_building2', modelname: 'call_api_create', content: '外部方式创建模板'}, config)

updateTemplate('0025f2e_upate_cms_template',  `love china, time: ${Date.now()}`, config)