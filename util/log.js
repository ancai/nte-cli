/**
 * output common message
 * @param {String} msg 
 */
const info = (msg, isShow) => {
  if (isShow === undefined || isShow) {
    console.log(msg)
  }
}

/**
 * output warning message
 * @param {String} msg 
 */
const warn = msg => {
  console.log('\x1b[33m%s\x1b[0m', msg)
}

/**
 * output error message
 * @param {String} msg 
 */
const err = msg => {
  console.log('\x1b[31m%s\x1b[0m', msg) // 红色
}

/**
 * output success message
 * @param {String} msg 
 */
const ok = msg => {
  console.log('\x1b[32m%s\x1b[0m', msg) // 绿色
}

module.exports = {info, warn, err, ok}
