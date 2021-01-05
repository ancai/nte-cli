async function testAsync() {
  console.log('Hello')
  await sleep(1000)
  console.log('world!')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const testSets = () => {
  const sets = new Set()
  sets.add('http://static.ws.126.net/common/share/yixin/b02/yixin.css')
  sets.add('http://static.ws.126.net/common/share/yixin/b02/weixin.css')
  sets.add('http://static.ws.126.net/common/share/yixin/b02/weibo.css')
  sets.forEach(val => console.log(val))
}

testAsync()
testSets()