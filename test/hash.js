/**
 * test hash function
 */
const hash = require('../bin/hash')
const fs = require('fs')
console.log(hash('var $$ = bowlder, scope = this;'))

const cssCnt = 'body{line-height:1.5;font-family:Arial,"Microsoft YaHei","Hiragino Sans GB",sans-serif;background:#fff;}'
const cssFile = hash(cssCnt)
fs.writeFile(`${__dirname}/head~${cssFile}.css`, cssCnt, err => {
  if (err) return
  console.log(`build hash CSS：head~${cssFile}.css`)
})