const fs = require('fs')

const imgPath = __dirname + '/assets/smile.png'

const IMG_URL_REG = /url\(['"]?([\w/:;,+=.?]+)['"]?\)/gm

const makeBase64URL = () => {
  console.log(imgPath)
  const stat = fs.statSync(imgPath)
  console.log(stat)
  const imgData = fs.readFileSync(imgPath)
  console.log(typeof imgData)
  const base64URL = 'data:image/png;base64,'+ imgData.toString('base64')
  console.log(base64URL)

  const cssRule = `.i-tie {
    background-image: url('${base64URL}')
  }`

  console.log('\r\nchecking whether match the base64 url:')
  console.log(IMG_URL_REG.test(cssRule))
}

makeBase64URL()