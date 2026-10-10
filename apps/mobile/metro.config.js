// @ts-check
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
const resolveRequest = config.resolver.resolveRequest

// Privy verifies its tokens with `jose`, whose default build reaches for
// Node's crypto. Its browser build uses WebCrypto, which the polyfill
// provides.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'jose') {
    const browser = { ...context, unstable_conditionNames: ['browser'] }
    return browser.resolveRequest(browser, moduleName, platform)
  }
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform)
}

module.exports = config
