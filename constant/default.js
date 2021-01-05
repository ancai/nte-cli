module.exports = {
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
  upload: {
    username: '',
    password: '',
    path: '',
    includeHtml: false,
    exclude: []
  },
  api: { // refering to back-end data api
    upload: {
      authentication: 'http://upload.ws.netease.com/fileupload/auth',
      postFile: 'http://upload.ws.netease.com/fileupload/add'
    }
  }
}
