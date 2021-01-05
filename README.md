# nte-cli

> Front-end project packaging tools

## Installation

  $ npm install nte-cli --g

## CLI using way

### step 1
nte-cli init | i [create initialize your project config]

### step 2
nte-cli build | b [integration of resources, inject dependency, compress code]

### step 3
nte-cli upload | u [upload static assets to CDN]

### step 4 (optional, only for CMS project)
nte-cli publish | p [push html file into the CMS template]

### for more option of configuration
```
{
  encoding: 'UTF-8',
  entry: '*.html', // or an array exp: ['./a.html', './module/b.html', './11/*.html']
  output: {
    cdnPath: '',
    clean: true, // whether remove existing file in dist folder, before each building
    dir: {
      root: 'dist',
      image: 'images',
      js: 'js',
      css: 'css',
      others: 'assets'
    },
    cssFile: 'head~[hash].css',
    jsFile: 'foot~[hash].js',
  },
  svnRoot: 'd:/frontend', // setting svn root dir for compatible with absolute paths of previous projects
  log: false,
  image: {
    base64: 1024 // less than 1024 byte, would convert to base64 url
  },
  upload: { // add item of "otppwd: ******" in outer network environment 
    username: '',
    password: '',
    path: '',
    includeHtml: false,
    exclude: []
  },
  api: {}
}
```

## module calling way

```
const nte_cli = require('nte-cli')
const paramConfig = require('./nte.config')

Object.assign(paramConfig.upload, {
    cwd: '../dist/js/test.js',
    path: 'f2e/test'
})
nte_cli.upload(paramConfig)
```

## major version

### >= 0.3.3
- support dynamic dependence and router

### v0.4.0
- fix bug: remove js file of unnecessary built [dist.js]

### v0.4.2
- optimize output formation of uploaded CDN url

### v0.5.0
- support for module invocation
- upgrade the dependent library (uglify-js | commander)