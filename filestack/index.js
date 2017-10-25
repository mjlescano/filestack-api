const { URL } = require('url');
const path = require('path');
const request = require('request');
const config = require('dos-config');
const url = require('./url');
const auth = require('./auth');

const { appSecret, apiKey, store } = config.filestack;

const filestack = module.exports = {};

/**
 * Get Filestack file signed url
 * More info: https://www.filestack.com/docs/rest-api/retrieve
 *
 * @method filestack.get
 * @param  {String} fileHandle Filestack file handle id
 * @return {String} Url of the file on Filestack's cdn
 */
filestack.get = function (fileHandle) {
  const date = new Date();

  const security = auth.policy(appSecret, {
    call: ['read'],
    url: fileHandle,
    expiry: date.setTime(date.getTime() + 60000) // 1 minute
  });

  const uri = new URL(`https://www.filestackapi.com/api/file/${fileHandle}`);

  uri.searchParams.set('key', apiKey);
  uri.searchParams.set('policy', security.policy);
  uri.searchParams.set('signature', security.signature);

  return Promise.resolve(uri.toString());
};

/**
 * Get Document info using Filestack docinfo:true param
 * More info: https://www.filestack.com/docs/document-transformations
 *
 * @method filestack.getDocumentInfo
 * @param  {String} fileUrl Document public url
 * @return {Promise} A promise that resolves with an object with docinfo
 */
filestack.getDocumentInfo = function (fileUrl) {
  const security = auth.policy(appSecret, {
    call: ['store', 'convert'],
    url: fileUrl
  });

  return req({
    method: 'GET',
    url: url(apiKey, {
      security,
      output: { docinfo: true }
    }, fileUrl)
  }).then((info) => ({
    pagesCount: info.numpages,
    naturalWidth: info.dimensions.width,
    naturalHeight: info.dimensions.height,
    aspectRatio: info.dimensions.height / info.dimensions.width,
    pages: {}
  })).catch((err) => {
    throw err;
  });
};

/**
 * Generate an image from a page of a document,
 * upload it to Azure, and remove from Filestack.
 * More info: https://www.filestack.com/docs/document-transformations
 *
 * @method filestack.generateDocumentPage
 * @param  {String} fileUrl Document public url
 * @param  {Integer} [page=1] Page to fetch
 * @return {Promise} Url of a jpg image from the first page of the doc
 */
filestack.generateDocumentPage = function (fileUrl, page = 1, options = {}) {
  const security = auth.policy(appSecret, {
    call: ['store', 'convert'],
    url: fileUrl
  });

  const opts = {
    security,
    output: {
      secure: true,
      compress: true,
      format: 'jpg',
      density: 125,
      page
    }
  };

  if (store.location) {
    opts.store = {
      location: store.location,
      container: store.container
    };

    let storePath = '';

    if (store.path) storePath += store.path;

    if (options.basePath) {
      if (options.basePath.slice(-1) !== '/') options.basePath += '/';
      storePath += options.basePath;
    }

    if (storePath) opts.store.path = `"${storePath}"`;

    if (store.region) opts.store.region = store.region;
  }

  return req({
    method: 'POST',
    url: url(apiKey, opts, fileUrl)
  }).then((page) => {
    const { url } = page;

    // add Filestack handle to the result from the url
    page.handle = url.slice(url.lastIndexOf('/') + 1);

    // add final filename
    page.basename = path.basename(page.key);

    // add the public URL from azure
    switch (store.location) {
      case '':
        page.publicUrl = page.url;
        break;
      case 'azure':
        page.publicUrl =
          `https://${store.account}.blob.core.windows.net/${store.container}/${page.key}`;
        break;
      case 'S3': {
        const region =
          (!store.region || store.region === 'us-east-1') ? 's3' : `s3-${store.region}`;

        page.publicUrl =
          `https://${region}.amazonaws.com/${store.container}/${page.key}`;
        break;
      }
    }

    return page;
  }).catch((err) => {
    throw err;
  });
};

/**
 * Remove a file from filestack
 * More info: https://www.filestack.com/docs/rest-api/remove
 *
 * @method filestack.remove
 * @param  {String} fileHandle Filestack handle id of the asset
 * @return {Promise}
 */
filestack.remove = function (fileHandle) {
  const security = auth.policy(appSecret, {
    call: ['remove'],
    handle: fileHandle
  });

  return new Promise((resolve, reject) => {
    request({
      method: 'DELETE',
      url: `http://www.filestackapi.com/api/file/${fileHandle}`,
      qs: {
        key: apiKey,
        policy: security.policy,
        signature: security.signature
      }
    }, (err, res, body) => {
      if (err) return reject(err);
      resolve(body);
    });
  });
};

// Promisified request() with JSON.parse
function req (options) {
  return new Promise((resolve, reject) => {
    request(options, (err, res, body) => {
      if (err) return reject(err);

      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(body);
      }
    });
  });
}
