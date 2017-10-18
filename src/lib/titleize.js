export default str =>
  str.replace(/(^[a-z])|(\s+[a-z])/g, txt => txt.toUpperCase())
