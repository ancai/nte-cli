const path = require('path')
const fs = require('fs')

const test = () => {
  const testHtml = path.resolve(__dirname, './assets/datahelper.html')
  const moduleReg = /<.*ne-module=([\w/'".]+).*>.*<\/.*>/gm
  fs.readFile(testHtml, 'UTF-8', (err, data) => {
    if (err) throw err
    data.match(moduleReg).forEach(module => {
      const modulePath = module.match(/ne-module=["']([\w/.]+)["']/)[1]
      const filePath = path.resolve(__dirname, modulePath)
      if (fs.existsSync(filePath.replace(/\.js$/, '.html'))) {
        console.log(fs.readFileSync(filePath))
      }
      // console.log(module.replace(/>(.*)</, '/>$1dfsadfa<'))
    })
  })
}

test()