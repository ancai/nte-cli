const fs = require('fs')

/**
 * Recursively delete a directory
 * 
 * @param {String} dir 
 */
const recurRemove = dir => {
  let files
  if (fs.existsSync(dir)) {
    files = fs.readdirSync(dir)
    files.forEach(item => {
      const childDir = dir + '/' + item
      if (fs.statSync(childDir).isDirectory()) {
        recurRemove(childDir)
      } else {
        fs.unlinkSync(childDir)
      }
    })
    fs.rmdirSync(dir)
  }
}

const set = new Set()
/**
 * find all files  in one directory involving child one
 * @param {String} dir directory
 * @returns {Set}
 */
const findFiles = dir => {
  fs.readdirSync(dir).forEach(item => {
    const childDir = dir + '/' + item
    if (fs.statSync(childDir).isDirectory()) {
      findFiles(childDir)
    } else {
      set.add(childDir)
    }
  })
  return set
}

/**
 * write json data into a local file
 */
const writeJSON = (data, filepath) => {
  fs.writeFileSync(filepath, JSON.stringify(data))
}

module.exports = {
  recurRemove,
  findFiles,
  writeJSON
}