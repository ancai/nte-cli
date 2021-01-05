/**
 * test http client request
 */
const agent = require('../util/agent')
const cookies = [ //account: montest123
  'NTES_PASSPORT=RrbaF7GRXFVn4bY48m42MvYkwoUFU4z1cPYJbsE0vlzd4eB3c4CByOukxCmkaKagqstMAIY.OrzS0Fviy6NyelTiaRSZ5UvmwBdCYfO9l25BQmui3gN1Q1pAC9T2N0IktlZ_35xMbaKV2xbKz4vjFEjCE_bTLQSUQ',
  'NTES_SESS=NOX0tnOBDInrEGFQ0mTwah16dTcOaW4XYrGQmGc_hjsBqimB3qtmALwaptSavTvUYVWct3aMtXnfIAaqysuTqGmRcf42aPf6xOoeTVc4I0f73ykRDQKDqYy7AF5T5JJg2DAP7nDj5bNiQprL7vXYrMUPBWP9V5UEntUChs53GrfTATa0hdVeTxAVF'
].join('; ')

const testGet = () => {
  agent.get('http://comment.api.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/users/myInfo?ibc=newssps')
    .set('Cookie', cookies) // seting header support a variety of way
    .end(resp => {
      console.log('\ntest get api data => response json:\n\n')
      console.log(resp.toJSON())
    })
  
  agent.get('https://img1.cache.netease.com/common/share/yixin/b02/yixin.css')
    .set({'Content-Type': 'text/css'})
    .end(resp => {
      console.log('\ntest get css resource => response text:\n\n')
      console.log(resp.text)
    })
}

const testPost = () => {
  agent.post('http://comment.api.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/SPEC0006B4A4CDFP/comments')
    .type('json')
    .set({'Cookie': cookies, 'Origin': 'http://c.m.163.com'})
    .set('Referer', 'http://c.m.163.com/nc/qa/activity/tie-sdk/index.html?docID=SPEC0006B4A4CDFP')
    .send({content: 'We must utilize all available resources.'})
    .end(resp => {
      console.log('\ntest sending json data => response json:\n\n')
      console.log(resp.toJSON())
    })

  agent.post('http://comment.api.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/SPEC0006B4A4CDFP/comments')
    .type('form')
    .set({'Cookie': cookies, 'Origin': 'http://c.m.163.com', 'Referer': 'http://c.m.163.com/nc/qa/activity/tie-sdk/index.html?docID=SPEC0006B4A4CDFP'})
    .send({content: 'A full 70-percent of surveyed HR workers in the U. S. admitted to rejecting a job applicant because of his or her Internet behavior.'})
    .end(resp => {
      console.log('\ntest sending form data => response json:\n\n')
      console.log(resp.text)
    })

  agent.post('http://comment.api.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/threads/SPEC0006B4A4CDFP/comments')
    .type('json')
    .set({'Cookie': cookies, 'Origin': 'http://c.m.163.com'})
    .set('Referer', 'http://c.m.163.com/nc/qa/activity/tie-sdk/index.html?docID=SPEC0006B4A4CDFP')
    .send({content: 'That can only happen in an outfit that has lost any sense of right and wrong.'})
    .end((resp) => {
      console.log('\ntest abortion \n\n')
      console.log(resp)
    })
    .abort()
}

const testResponse = () => {
  agent.get('http://comment.api.163.com/api/v1/products/a2869674571f77b5a0867c3d71db5856/users/myInfo?ibc=newssps')
    .set('Cookie', cookies) // seting header support a variety of way
    .end(resp => {
      console.log('\ntest response result \n\n')
      console.log(resp.toJSON(), resp.text)
    })
}

testGet()
testPost()
testResponse()
