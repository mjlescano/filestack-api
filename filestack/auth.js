const crypto = require('crypto');
const escapeStringRegexp = require('escape-string-regexp');

/**
 * Generate a policy for a fileUrl
 * More info: https://www.filestack.com/docs/security/creating-policies
 *
 * @method policy
 * @param  {string} appSecret Filestack app secret
 * @param  {Object} data Information to add to the policy
 * @return {Object} Object containing a policy and a signature
 */
module.exports.policy = function policy(appSecret, data) {
  if (!appSecret) return {};

  const policyData = Object.assign({
    expiry: 8640000000000000 // Infinity
  }, data);

  if (policyData.url) {
    policyData.url = escapeStringRegexp(policyData.url);
  }

  const policy = urlSafeBase64(JSON.stringify(policyData));

  const signature = crypto.createHmac('sha256', appSecret)
    .update(policy)
    .digest('hex');

  return { policy, signature };
};

/**
 * Generate an auth header from an appSecret
 * More info: https://www.filestack.com/docs/security/rest-authorization
 *
 * @method header
 * @param  {string} appSecret Filestack app secret
 * @return {Object} Object containing a policy and a signature
 */
module.exports.header = function header(appSecret) {
  if (!appSecret) return {};

  return {
    name: 'Authorization',
    value: `Basic ${urlSafeBase64(`app:${appSecret}`)}`
  };
};

function urlSafeBase64(str) {
  return new Buffer(str).toString('base64')
    .replace(/\+/g, '-') // Convert '+' to '-'
    .replace(/\//g, '_'); // Convert '/' to '_'
}
