
const isObject = (obj) => {
  if (typeof obj === 'object') {
    return Reflect.ownKeys(obj).length > 0
  }
  return false
}

/**
 * Copy the values of all of the enumerable own properties from  source object to a
 * target object. Returns the target object.
 * solve the shortcome of [Object.assign] which only merging root property
 * @param target The target object to copy to.
 * @param source The source object from which to copy properties.
 */
const recursiveMerge = (target, source) => {
  Reflect.ownKeys(source).forEach(key => {
    if (target[key] && isObject(target[key]) && isObject(source[key])) {
      recursiveMerge(target[key], source[key])
    } else {
      target[key] = source[key]
    }
  })
  return target
}

module.exports = {
  isObject,
  mergeJSON: recursiveMerge
}