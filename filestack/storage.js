const url = require('url');
const aws4 = require('aws4');
const config = require('dos-config');

const { store } = config.filestack;

module.exports.assetPath = function assetPath(owner, mural, asset = '') {
  return `/${owner}/${mural}/${asset}`;
};

module.exports.assetUrl = function assetUrl(owner, mural, asset) {
  return new Promise((resolve, reject) => {
    if (store.location !== 'S3') {
      return reject(new Error('Filestack storage needs to be configured'));
    }

    const path = module.exports.assetPath(owner, mural, asset);

    // Signature that expires in 3 mins
    const signed = fetchS3(store, `${path}?X-Amz-Expires=${60 * 3}`);

    const uri = url.format({
      protocol: 'https',
      host: signed.hostname,
      pathname: signed.path
    });

    return decodeURIComponent(uri);
  });
};

function fetchS3 (store, path) {
  const uri = url.parse(path);

  return aws4.sign({
    service: 's3',
    signQuery: true,
    region: store.region,
    path: uri.path
  }, {
    accessKeyId: store.account,
    secretAccessKey: store.secret
  }, 1);
}
