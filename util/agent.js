// send http request and receive server response data
const http = require('http')
const https = require('https')
const { URL } = require('url')
const querystring = require('querystring')

/**
 * https request regular expression
 */
const HTTPS_REG = /https:/i

/**
 * defau port of http requst
 */
const DEFAULT_HTTP_PORT = 80
const DEFAULT_HTTPS_PORT = 443

/**
 * shortcut of mime type
 */
const mime = {
  'html': 'text/html',
  'text': 'text/plain',
  'form': 'application/x-www-form-urlencoded',
  'json': 'application/json',
  'file': 'multipart/form-data'
}

/**
 * uploading file form
 */
const MULTIPART_BOUNDARY = 'multiPartFormBoundary'
const UPLOAD_FILE_KEY = 'file'

const isObj = obj => (typeof obj === 'object')

/**
 * Http Request class
 */
class Request {
  /**
   * Http Request constructor
   * @param {String} method http method
   * @param {String} url request url
   */
  constructor (method, url) {
    const { protocol, hostname, port, pathname, search } = new URL(url)

    this.options = {
      method,
      protocol,
      hostname,
      port: port || (HTTPS_REG.test(protocol) ? DEFAULT_HTTPS_PORT : DEFAULT_HTTP_PORT),
      path: pathname + search,
      headers: {
        'Content-Type': mime.form,
        'Cache-Control': 'no-cache',
        // Sending a 'Content-Length' header will disable the default chunked encoding. so don't set
      },
      timeout: 5000
    }
    this.data = null,
    this.rawRequest = null,
    this.dataType = 'form'
  }

  /**
   * set http request headers by key-val or an object way
   * @param {String} key 
   * @param {String} val 
   */
  set (key, val) {
    if (arguments.length === 1) {
      if (isObj(arguments[0])) {
        Object.assign(this.options.headers, arguments[0])
      } else {
        throw new Error('if given one parameter must be an Object type')
      }
    } else {
      this.options.headers[key] = val
    }
    return this
  }

  /**
   * shortcut for http request Content-Type
   * @param {String} key form | json | file | html | text
   */
  type (key) {
    let val = mime[key]
    if (key === 'file') {
      val += `; boundary=${MULTIPART_BOUNDARY}`
    }
    this.options.headers['Content-Type'] = val
    this.dataType = key
    return this
  }

  /**
   * set url query parameter
   * @param {Object | String} parameter
   */
  query (parameter) {
    let search
    if (isObj(parameter)) {
      search = querystring.stringify(parameter)
    } else {
      search = parameter
    }
    this.options.path += (/\?/.test(this.options.path) ? '&' : '?' + search)

    return this
  }

  /**
   * set http post data
   * @param {Object} data 
   */
  send (data) {
    if (data) {
      this.data = data
    } else {
      throw new Error('data invalid!')
    }
    return this
  }

  /**
   * set request timeout
   * @param {Number} timeout 
   */
  timeout (timeout) {
    this.options.timeout = timeout
    return this
  }

  /**
   * abort http request
   */
  abort () {
    if (!this.rawRequest.aborted) {
      this.rawRequest.abort()
    }
    return this
  }

  /**
   * create multipart/form-data
   */
  makeMultipartData () {
    let data = `Content-Type: multipart/form-data; boundary=${MULTIPART_BOUNDARY}\r\n`
    const splitLine = '\r\n--' + MULTIPART_BOUNDARY +'\r\n'
    let val
    Object.keys(this.data).forEach(key => {
      val = this.data[key]
      data += splitLine
      if (key !== UPLOAD_FILE_KEY) {
        data += `Content-Disposition: form-data; name="${key}"\r\n\r\n`
        data += `${val}`
      }
    })

    // make file field
    if ((val = this.data[UPLOAD_FILE_KEY])) {
      const { filename, contentType } = val.options
      data += splitLine
      data += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`
      data += `Content-Type: ${contentType}\r\n`
      data += 'Content-Transfer-Encoding: binary\r\n\r\n'
    }
    
    return data
  }

  /**
   * write file readable stream into Http request writeable stream
   */
  writeFileStream () {
    let val
    if ((val = this.data[UPLOAD_FILE_KEY])) {
      const fileStream = val.value
      fileStream.pipe(this.rawRequest, {end: false})
      fileStream.on('end', () => {
        this.rawRequest.end('\r\n--' + MULTIPART_BOUNDARY +'--')
      })
    } else {
      this.rawRequest.end()
    }
  }

  /**
   * end http request, receive callback function
   * @param {Function} callback 
   */
  end (callback) {
    const { method, protocol } = this.options
    let rawCnt = '', postData = this.data
    const httpAgent = HTTPS_REG.test(protocol) ? https : http

    if (method === 'POST' && isObj(postData)) {
      switch (this.dataType) {
      case 'form':
        postData = querystring.stringify(this.data)
        break
      case 'json':
        postData = JSON.stringify(this.data)
        break
      case 'file':
        postData = this.makeMultipartData()
        break
      default:
        throw new Error('unsupport Content-Type!')
      }
    }
    if (method === 'POST' && this.dataType !== 'file') {
      this.set('content-length', Buffer.byteLength(postData))
    }

    const req = this.rawRequest = httpAgent.request(this.options, res => {
      res.on('data', chunk => {
        rawCnt += chunk
      })
      res.on('end', () => {
        callback(new Response(res, rawCnt, this))
      })
    })
    req.on('error', err => {
      callback(new Response(null, err, this))
    })

    if (postData) {
      req.write(postData)
    }

    if (this.dataType !== 'file') {
      req.end()
    } else {
      this.writeFileStream()
    }
    return this
  }
}

/**
 * Http Response class
 */
class Response {
  /**
   * constructor, the wrapper for http.ServerResponse class
   * @param {Class} rawResponse 
   * @param {String} chunk respnse data
   * @param {Class} request
   */
  constructor (rawResponse, chunk, request) {
    if (rawResponse) {
      const { statusCode: status } = rawResponse
      this.isOK = true
      this.status = status
      this.text = chunk
      this.raw = rawResponse
      if (status >= 400 || status >= 500) {
        const { path, method } = request.options
        const msg = `cannot ${method} ${path} (${status})`
        const err = new Error(msg)
        err.path = path
        err.method = method
        this.isOK = false
        this.err = err
      }
    } else { // sending request emerge error and don't have http response
      this.isOK = false
      this.err = new Error(`when sending request merged error: ${chunk}`)
      this.text = chunk
      this.status = 0
    }
  }

  toJSON () {
    try {
      return this.status === 0 ? this.text : JSON.parse(this.text)
    } catch (error) {
      throw new Error(`can not parse ${this.text} to JSON Object!`)
    }
  }
}

const agent = {
  get: url => new Request('GET', url),
  post: url => new Request('POST', url)
}

module.exports = agent