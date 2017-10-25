/**
 * Filestack url generator for transform api
 * @method url
 * @param  {...(string|Object)} param
 * @return {string} Url for the filestack transformation
 */
module.exports = function url(...params) {
  return `https://process.filestackapi.com/${params.map(urlOptions).join('/')}`;
};

function urlOptions (options) {
  if (typeof options === 'string') return options;

  return Object.keys(options).map((option) => {
    const values = Object.keys(options[option]).reduce((values, key) => {
      const val = options[option][key];
      if (val) values.push(`${key}:${encodeURIComponent(val)}`);
      return values;
    }, []).join(',');

    return `${option}=${values}`;
  }).join('/');
}
