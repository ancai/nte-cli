// define(['../../js/request.js','!../../js/lib/raphael.js;../../js/lib/chart.core.js;../../js/lib/chart.frame.js'], 
// 	function(requestHub) {
// 		var scope = this,
// remove  the second dependent path
const testRemodelingDep = () => {
  let codeStr = `define(['../../js/request.js','!../../js/lib/raphael.js;../../js/lib/chart.core.js;../../js/lib/chart.frame.js'], 
    function(requestHub) {
      var scope = this,`,
    index = codeStr.indexOf(/define/),
    // the start position of dependent modules
    startIdx = codeStr.indexOf('[', index) + 1, 
    // the end position of dependent modules
    endIdx = codeStr.indexOf(']', index)
  let reModPaths = []
  const depModules = codeStr.substring(startIdx, endIdx)
    .replace(/[\n\r\t"']/g, '')
  console.log('depModules:', depModules)
  depModules.split(/,/).forEach(itemPath => {
    if (/\.js$/i.test(itemPath) && !/^!|(https?:)?\/\//.test(itemPath)) {
      reModPaths.push(`"${itemPath}"`)
    } else {
      console.log('remove dependency: ' + itemPath)
    }
  })
  codeStr = codeStr.substring(0, startIdx) + reModPaths.join(',') + codeStr.substring(endIdx)
  console.log(codeStr)
  
  return codeStr
}

const modPaths = ['', '../js/request.js', 'modules/tools.js', '', 'modules/request.js']
const testValidPaths = (modPaths) => {
  modPaths.filter(item => !!item)
    .forEach(item => console.log('valid path:', item))
}

const testHtmlModule = () => {
  const reg = /ne-module=['"](@?[\w./-]+?)['"].*?>[\r\n\t\s]*<\//gm
  const htmlCode = '<div class="share-join-item" ne-module="/modules/shares/shares.js" ne-state="cls.hover:ne-shares-open;title:<%=newrow.title%>;url:<%=newrow.docurl%>;pic:<%=newrow.imgurl%>" ne-props="skin:pop6x1"></div>'
  const moduleHtml = `<ul class="ne-shares">
      <li class="share-lofter">
        <a ne-click="share('lofter')" title="分享到LOFTER" href=""> <i class="ep-share-icon ep-share-lofter"></i>
        </a>
      </li>
    </ul>`
  if (reg.test(htmlCode)) {
    let mergedHtml = htmlCode.replace(reg, (match, p1, p2) => {
      const tempStr = match.replace(p1, '')
      return tempStr + tempStr.substring(0, tempStr.length - 2) + moduleHtml +'</'
    })
    console.log('mergedHtml:', mergedHtml)
  }
}

const testPropsAndState = () => {
  const propsReg = /ne-props=["'](.*?)["'](\s|>)/g
  const stateReg = /ne-[a-z-]+=["'](.*?{{.*?}}.*?)["'](\s|>)/g
  const expReg = /{{(.*?)}}/g
  const props = {}
  let codeStr = '<div ne-props="focus:true;events:mouseover;interval:4000;" ne-module="modules/slide/slide.html" class="topnews_focus"></div>'
  let childStr = `<div ne-module="/modules/slide/slide.js" class="mod_focus" ne-class="{{props.focus ? 'foucs_wrap' : ''}}" ne-state="events={{props.events||'mouseover'}};interval={{props.interval||4000}}">
                    <div ne-role="slide-body" class="focus_body">
                    </div>
                  </div>`
  if (propsReg.test(codeStr)) {
    codeStr = codeStr.replace(propsReg, (match, p1) => {
      console.log('props:', p1)
      p1.split(/;/).forEach(item => {
        const ary = item.split(/:/)
        if (ary.length === 2) {
          props[ary[0].trim()] = ary[1].trim()
        }
      })
      return ''
    })
    console.log('codeStr:', codeStr)
    console.log('props:', props)
    childStr = childStr.replace(stateReg, (match, p1) => {
      console.log('state:', match, 'p1:', p1)
      return match.replace(expReg, (match, p1) => {
        console.log('state-exp:', match, 'p1:', p1)
        return (new Function('props', `return ${p1}`))(props)
      })
    })
    console.log('childStr:', childStr)
  }
}

const testSkins = () => {
  const skins = {
    '/news/liveshow_timeline/js/module/shares/shares.html': '\n<ul class="ne-shares">\n <li class="share-yixin">\n  <a ne-click="share(\'yixin\')" title="\u5206\u4eab\u5230\u6613\u4fe1" href="">\n   <i class="ep-share-icon ep-share-yixin"></i>\n  </a>\n </li>\n <li class="share-weixin">\n  <a ne-mouseover="initWeixin()" href="javascript:" target="_self" class="ne-shares-weixin">\n   <i class="ep-share-icon ep-share-weixin"></i>\n\n   <div class="ne-shares-qrwrap">\n    <div class="ne-shares-qrarr"></div>\n    <div ne-role="qrcode" class="ne-shares-qrcode"></div>\n    <p>\u7528\u5fae\u4fe1\u626b\u7801\u4e8c\u7ef4\u7801</p><p>\u5206\u4eab\u81f3\u597d\u53cb\u548c\u670b\u53cb\u5708</p>\n   </div>\n  </a>\n </li>\n <li class="share-sina">\n  <a ne-click="share(\'sina\')" title="\u5206\u4eab\u5230\u5fae\u535a" href="">\n   <i class="ep-share-icon ep-share-sina"></i>\n  </a>\n </li>\n <li class="share-qzone">\n  <a ne-click="share(\'qzone\')" title="\u5206\u4eab\u5230QQ\u7a7a\u95f4" href="">\n   <i class="ep-share-icon ep-share-qzone"></i>\n  </a>\n </li>\n <li class="share-youdao" style="display:none">\n  <a ne-click="share(\'youdao\')" title="\u6536\u85cf\u5230\u6709\u9053\u4e91\u7b14\u8bb0" href="">\n   <i class="ep-share-icon ep-share-youdao"></i>\n  </a>\n </li>\n\n</ul>\n',
    '/news/liveshow_timeline/js/module/img/img.html': '<div class="imglist">\n    <div class="imglist-inner" ne-class="imglsit-type-{{imgs.length}}">\n        <div class="imglist-inner2">\n            <ul class="imglist-img clearfix">\n                <script type="text/template" ne-repeat="img in imgs">\n                    <li ne-if="{{__i<9}}">\n\n                        <% if(imgs.length==1) {%>\n\n                        <img src="<%=img.img%>" alt="" ne-click="startModal(__i)">\n\n                        <% }  else {%>\n\n                        <div class="imglist-img-item"\n                             style="background-image: url(<%=img.img%>)"\n                             ne-click="startModal(__i)"></div>\n\n                        <% } %>\n\n                    </li>\n                </script>\n            </ul>\n        </div>\n    </div>\n</div>',
    '/news/liveshow_timeline/js/module/news/news.html': '\n<div class="live-news" ne-show="{{news.des}}">\n    <p>\n        <span ne-text="{{news.des}}"></span>\n        <input type="button" value="[\u8be6\u7ec6]" ne-click="openNews()" />\n    </p>\n</div>',
    '/news/liveshow_timeline/js/module/msg/msg.html': '<div class="live-msg" msgid="{{msg.id}}">\n    <div class="live-msg-redIcon" ne-if="{{msg.isHourHeader}}"></div>\n    <div class="live-msg-info">\n        <span class="live-user-avatar"\n              ne-style="{{ msg.commentator.imgUrl?\'background-image:url(\'+msg.commentator.imgUrl+\')\':\'\' }}">\n            <img class="live-user-avatar-iehack" ne-src="{{msg.commentator.imgUrl}}" ne-if={{bowlder.utils.msie<9}} >\n        </span>\n        <span class="live-user-name" ne-text="{{msg.commentator.name}}"></span>\n        <span class="live-time-time" ne-text="{{msg.time}}"></span>\n    </div>\n\n    <div class="live-time-content">\n        <p class="live-msg-title" ne-class="{{msg.news?\'newsTitle\':\'\'}}" ne-html="{{msg.title}}" ne-if="msg.title" ne-click="clickTitle()"></p>\n        <p class="live-msg-content" ne-style="{{msg.style}}" ne-html="{{msg.content}}"></p>\n\n        <div class="live-quote live-msg-other" ne-if="{{msg.quote}}">\n            <p class="live-quote-name">\n                <span class="live-quote-avatar"\n                      ne-style="{{msg.quote.avatar?\'background-image:url(\'+msg.quote.avatar+\')\':\'\'}}"></span> {!{msg.quote.name}}</p>\n            <p class="live-quote-msg" ne-html="{{msg.quote.msg}}"></p>\n        </div>\n\n        <div ne-role="album" class="live-msg-other" ne-show="{{msg.album}}"></div>\n        <div ne-role="audio" class="live-msg-other" ne-show="{{msg.audio}}"></div>\n        <div ne-role="video" class="live-msg-other" ne-show="{{msg.video}}"></div>\n        <div ne-role="imgs" class="live-msg-other" ne-show="{{msg.imgs}}"></div>\n        <div ne-role="news" class="live-msg-other" ne-show="{{msg.news}}"></div>\n\n    </div>\n\n    <div class="live-msg-water live-water-quote" ne-if="{{msg.quote&&!msg.isTop}}"></div>\n    <div class="live-msg-water live-water-top" ne-if="{{msg.isTop}}"></div>\n\n\n\n    <div class="live-share clearfix">\n        <span class="live-share-title">\u5206\u4eab\u5230\uff1a</span>\n        <div class="live-share-btns" ne-role="share"></div>\n    </div>\n</div>',
    '/news/liveshow_timeline/js/module/video/video.html': '<div class="video">\n    <div class="video-desc" style="display: none">\n        <span class="video-title">{{extend.title||\'\'}}</span>\n        <span class="video-source">{{extend.source?\'(\u6765\u6e90\uff1a\'+extend.source+\')\':\'\'}}</span>\n    </div>\n    <div class="video-content">\n        <div ne-if="{{!isLocalVideo}}" ne-html="thirdParty" class="thirdPartyVideo"></div>\n        <div class="localVideo" ne-show="{{isLocalVideo}}" ne-role="local">\n\n        </div>\n\n    </div>\n</div>',
    '/news/liveshow_timeline/js/module/audio/audio.html': '<div class="audio">\n    <div class="audio-bar" ne-click="toggleAudio()" ne-style="width:{{length}}%">\n        <span class="audio-icon" ne-class="{{isPlay?\'active\':\'\'}}"></span>\n        <span class="audio-duration" ne-class="audio-duration-error">{{duration}}</span>\n    </div>\n    <audio ne-src="{{audioSrc}}" ne-role="audio"></audio>\n</div>',
    '/news/liveshow_timeline/js/module/album/album.html': '<div class="live-album">\n    <div  class="live-album-content" ne-click="startModal()">\n        <div class="live-album-content-cover"\n             ne-style="background-image:url({{extend.coverImg}})">\n        </div>\n        <div ne-show="photos" class="live-album-flag">\u56fe\u96c6&nbsp;{{photos.length}}P</div>\n    </div>\n</div>'
  }
  for (let key in skins) {
    console.log('key:', skins[key])
  }
}

// testRemodelingDep()
// testValidPaths(modPaths)
// testHtmlModule()
// testPropsAndState()
testSkins()