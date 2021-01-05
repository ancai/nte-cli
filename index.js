#!/usr/bin/env node
const program = require('commander')

const initialize = require('./bin/initialize')
const build = require('./bin/build')
const { upload } = require('./bin/upload')
const publish = require('./bin/publish')
const checkUpdate = require('./bin/check')

const pkg = require('./package.json')

// check for new versions 
try {
  checkUpdate()
} catch (error) {}

program
  .version(pkg.version, '-v, --version')
  .command('init')
  .alias('i')
  .description('initialize your project config')
  .action(initialize)

program
  .command('build')
  .alias('b')
  .description('integration of resources, inject dependency, compress code')
  .action(build)

program
  .command('upload')
  .alias('u')
  .description('upload static assets to CDN')
  .action(upload)

program
  .command('publish')
  .alias('p')
  .description('push html file into the CMS template')
  .action(publish)

program.parse(process.argv)

if (!/init|i|build|b|upload|u|publish|p/.test(process.argv[2])) {
  console.log('The command entered is incorrect!')
  program.outputHelp()
}

module.exports = { upload }
