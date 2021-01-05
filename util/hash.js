const crypto = require('crypto')
const fs = require('fs')

const hl = [],
  hl16 = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f']

for(let i = 0; i < 256; i++){
  hl[i] = ((i >> 4) & 15).toString(16) + (i & 15).toString(16)
}

/* eslint-disable */
/**
 * inputed content hash
 * @param {String} str 
 */
const hash = str => {
  let i,l=str.length-3,t0=0,v0=0x2325,t1=0,v1=0x8422,t2=0,v2=0x9ce4,t3=0,v3=0xcbf2;
  for (i = 0; i < l;) {
    v0^=str.charCodeAt(i++);
    t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
    t2+=v0<<8;t3+=v1<<8;
    t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
    v0^=str.charCodeAt(i++);
    t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
    t2+=v0<<8;t3+=v1<<8;
    t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
    v0^=str.charCodeAt(i++);
    t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
    t2+=v0<<8;t3+=v1<<8;
    t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
    v0^=str.charCodeAt(i++);
    t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
    t2+=v0<<8;t3+=v1<<8;
    t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
  }

  while(i<l+3){
    v0^=str.charCodeAt(i++);
    t0=v0*435;t1=v1*435;t2=v2*435;t3=v3*435;
    t2+=v0<<8;t3+=v1<<8;
    t1+=t0>>>16;v0=t0&65535;t2+=t1>>>16;v1=t1&65535;v3=(t3+(t2>>>16))&65535;v2=t2&65535;
  }

  return hl16[v3&15]+hl[v2>>8]+hl[v2&255]+hl[v1>>8]+hl[v1&255]+hl[(v0>>8)^(v3>>12)]+hl[(v0^(v3>>4))&255];
}

const MAX_READ_SIZE = 10240

/**
 * creating hash digests of file
 * @param {String} filepath 
 * @param {String} algorithm MD5：128位 SHA-1：160位 SHA256 ：256位 SHA512：512位
 */
const hashFile = (filepath, algorithm) => {
  const hash = crypto.createHash(algorithm)
  const buffer = Buffer.alloc(MAX_READ_SIZE, 0)
  const fd = fs.openSync(filepath, 'r')
  let byteRead = 0
  do {
    byteRead = fs.readSync(fd, buffer, 0, MAX_READ_SIZE)
    hash.update(buffer.slice(0, byteRead))
  } while (byteRead === MAX_READ_SIZE)
  fs.closeSync(fd)

  return hash.digest('hex')
}

module.exports = { hash,  hashFile }