const path = require('path')
const fs = require('fs')

const log = require('../util/log')
const { CONFIG_NAME } = require('../constant/global')
const mimeTypes = require('../constant/mime')
const defaultConfig = require('../constant/default')
const agent = require('../util/agent')
const hash = require('../util/hash')
const fo = require('../util/fo')
const lang = require('../util/lang')

let config

const IGNORE_FILE_REG = /\.s?html?$/i

const req = (url, type, data) => {
  return new Promise((resolve, reject) => {
    agent.post(url)
      .type(type)
      .send(data)
      .end(resp => {
        log.info(resp.toJSON(), config.log)
        resp.isOK ? resolve(resp.toJSON()) : reject(resp.error)
      })
  }) 
}

const validCdnPath = (cdnPath) => {
  //compiled with the case of onlinePath not a string
  if (cdnPath) {
    cdnPath = (cdnPath + '').trim()
  }

  // empty cdnPath is not allowed
  if (!cdnPath) {
    cdnPath = 'f2e/test'
  }
  else {
    // remove the head and the tail '/' '\'
    cdnPath = cdnPath.replace(/^[\\/]|[\\/]$/g, '')
  }
  return cdnPath
}

/**
 * the method will be called, when uploading occured failure
 */
let authPromise
const getValidAuth = (user, pwd, otppwd, refresh) => {
  if (!authPromise || refresh) {
    return authPromise = authenticate(user, pwd, otppwd)
  } else {
    return authPromise = authPromise.then(session => session, err => {
      return authenticate(user, pwd, otppwd)
    })
  }
}

/**
 * be called in uploadFile
 */
const uploadStream = (session, rs, filename, path, md5) => {
  let mimeType
  const extName = /\.\w+$/.exec(filename)[0]
  if (extName) {
    mimeType = mimeTypes[extName]
  }
  if (!mimeType) {
    mimeType = mimeTypes['default']
  }
  return req(config.api.upload.postFile, 'file', {
    file: {
      value: rs,
      options: {
        filename: filename,
        contentType: mimeType
      }
    },
    md5: md5,
    filename: filename,
    session: session,
    path: path
  })
}

const uploadFile = function (session, filePath, fileName, onlinePath = '', baseFilePath, strict) {
  const fileStream = fs.createReadStream(filePath)
  const md5 = hash.hashFile(filePath, 'md5')
  let cdnPath
  const onlinePathIsFunction = typeof onlinePath === 'function'
  const startTime = Date.now()

  // compatible with function of onlinePath
  if (onlinePathIsFunction) {
    cdnPath = onlinePath(filePath) || ''
  } else {
    cdnPath = onlinePath
  }
  cdnPath = validCdnPath(cdnPath)

  //strict strategy for directory
  if (strict) {
    var dir = path.dirname(filePath) // don't include '/' at end
    if (dir.indexOf(baseFilePath) > -1) {
      cdnPath = path.join(cdnPath, path.relative(baseFilePath, dir))
    }
  }

  //to '\' dir splitor to '/' for window OS
  cdnPath = cdnPath.replace(/[\\]/g, '\/')
  //file md5 filename session path
  return uploadStream(session, fileStream, fileName, cdnPath, md5)
    .then(body => {
      const { cdnPath: cdnBase } = config.output
      const url = cdnBase + cdnPath + '/' + fileName
      const {resultcode, msg} = body
      let errMsg
      if (resultcode !== 200) {
        errMsg = msg
        log.err(`[×]  ${filePath} : ${errMsg}`)
      } else {
        log.ok(`[√] [${filePath}] ---> [ ${url} ]`)
      }
      return {
        error: errMsg,
        body: body,
        url,
        file: filePath,
        fileName: fileName,
        path: cdnPath,
        md5: md5,
        startTime: startTime,
        duration: Date.now() - startTime
      }
    }, err => {
      log.err(err)
    })
}

/**
* authentication for user
* @param {String} username account
* @param {String} password password
* @param {String} token required in outside network env
*/
const authenticate = async (username, password, token) => {
  let session
  log.info('launch to send request for authentication', config.log)
  const body = await req(config.api.upload.authentication, 'json', {username, password, otppwd: token})
  if (body.resultcode === 8200) {
    log.ok('verified user success!')
    session = body.data
  } else {
    log.err(`verified user fail: ${JSON.stringify(body)}`)
  }
  
  return session
}

/**
 * upload local static asset to CDN server
 * @param username {string}     username
 * @param password {string}     password
 * @param path {string|function}
 * @param cwd {string}
 * @param strict {boolean}
 * @param exclude {string|array}    exclusiveness pattern
 * @param session {string}          compiled with index.js for inner way
 * @param includeHtml {boolean}     Whether to ignore html file
 * @param retryTimes {Number}       30
 * @param fileName {function}       custom file name
\ */
const addFile = async (pattern, {username, password, otppwd, path: onlinePath, cwd, strict = true, session, exclude = [],includeHtml = true, fileName: getFileName, retryTimes = 5}) => {
  const dist = cwd ? path.resolve(cwd) : config.output.dir.root
  const stat = fs.lstatSync(dist)
  let files
  if (stat.isFile(dist)) {
    files = [dist]
  } else {
    files = Array.from(fo.findFiles(dist))
  }

  if (otppwd && typeof otppwd !== 'string') {
    throw new Error('type error: otppwd should a string')
  }

  if (getFileName && typeof getFileName !== 'function') {
    throw new Error('type error: getFileName should a function.')
  }

  if (!Array.isArray(exclude)) {
    if (typeof exclude === 'string') {
      exclude = [exclude]
    } else { // exclude = []
      throw new Error('type error: required an Array for exclude parameter.')
    }
  }

  if (!session) {
    session = await authenticate(username, password, otppwd)
    log.info(session, config.log)
  }

  if (exclude.length > 0) {
    files = files.filter(file => !exclude.some(patter => new RegExp(patter).test(file)) )
  }

  if (!includeHtml) {
    files = files.filter((file) => {
      const extName = path.extname(file)
      let flag = true
      if (IGNORE_FILE_REG.test(extName)) {
        log.info(`[×] ${file} : ignore html file`, config.log)
        flag =  false
      }
      return flag
    })
  }

  //transform : [  [absPath,name] , ...  ]
  files = files.map(file => {
    let name
    if (getFileName) {
      name = getFileName(file)
      if (typeof name === 'string') name = name.trim()
      else if (name) name += ''
      else name = ''
    }
    else name = path.basename(file)
    return [file, name]
  })

  // ext name is necessary for getting mime-type
  files = files.filter(([file, name], index) => {
    let flag = false
    if (!name) {
      log.info(`[×] ${file} : ignore file of empty name`, config.log)
    }
    else if (!path.extname(file)) {
      log.info(`[×] ${file} : ignore, ${name} no extension name is specified`, config.log)
    }
    else flag = true
    return flag
  })
  log.info(`in total ${files.length} file，start upload`, config.log)


  //results: [ {error:object|undefined, url:string, file:string,} ]

  var results = await Promise.all(files.map(([file, name]) => {
    return uploadFile(session, file, name, onlinePath, dist, strict)
  }))

  // retry 2 times after failure
  var retryLen = 0
  var hasError = results.some(result => result.error)

  while (retryLen < retryTimes && hasError && username && password) {
    retryLen++

    log.err(`upload failure，retry ${retryLen} time :`)
    log.info(`prev session: ${session}`, config.log)
    session = await getValidAuth(username, password, otppwd, true)
    log.info(`new session: ${session}`, config.log)
    results = await Promise.all(results.map((result, i) => {
      if (!result.error) return result
      const [file, name] = files[i]
      return uploadFile(session, file, name, onlinePath, cwd, strict)
    }))

    hasError = results.some(result => result.error)
  }


  const urls = results.filter(({error}) => !error).map(({url}) => url)
  const isSuccess = urls.length === results.length
  if (isSuccess) {
    log.ok('upload over , all success')
  }
  else {
    log.err(`upload over , failure: ${results.length - urls.length} , success: ${urls.length}`)
    if (username) {
      log.err(`username: ${username}`)
    }
    log.err(`session: ${session}`)

    results.filter(detail => detail.error).forEach((detail, index) => {
      log.err(`${index}.`)
      log.err(` - error: ${JSON.stringify(detail.error)}`)
      log.err(` - file: ${detail.file}`)
      log.err(` - md5: ${detail.md5}`)
      log.err(` - path: ${detail.path}`)
      log.err(` - time: ${detail.startTime}`)
    })
  }

  const returnData = { urls, details: results }
  if (isSuccess) return returnData
  else return Promise.reject(returnData)
}

/**
 * main method entrance for uploading
 * @param {Object} paramConfig  param config by code calling
 */
const upload = (paramConfig) => {
  const configPath = path.resolve(CONFIG_NAME)
  if (paramConfig && paramConfig.upload) {
    config = lang.mergeJSON(defaultConfig, paramConfig)
  } else if (fs.existsSync(configPath)) {
    config = lang.mergeJSON(defaultConfig, require(configPath))
  }
  addFile(['*'], {
    ...config.upload
  })
}

module.exports.upload = upload