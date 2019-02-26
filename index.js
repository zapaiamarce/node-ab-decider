const proxy = require("express-http-proxy");
const { reduce, find, assign, each, random } = require("lodash");
const cookieParser = require("cookie-parser");

const DEFAULT_COOKIE_NAME = "variant";
const HASH_SPLITTER = "@"

const decider = (exps, choosen, forceReturn) => {
  const sumOfWeights = reduce(exps, (p, c) => p + c.weight, 0);
  if (sumOfWeights > 100)
    process.emitWarning("Sum of weights has to be less than 100");
  if (sumOfWeights < 100)
    process.emitWarning(
      `Sum of weights is less than 100 (${sumOfWeights}). We recomend use 100 as total.`
    );
  if (!sumOfWeights) return process.emitWarning("Sum of weights is invalid");

  // si tiene una variante elegida previamente
  if (choosen) {
    // si no existe por algún motivo se sortea de nuevo sin el choosen
    return exps[choosen]
      ? assign({}, exps[choosen], { name: choosen })
      : decider(exps, false, forceReturn);
  } else {
    const num = Math.floor(Math.random() * 100);
    each(exps, (x, k) => (x.name = k));
    let counter = 0;
    const found = find(exps, (x, name) => {
      counter = counter + x.weight;
      return counter > num ? true : false;
    });

    return !found && forceReturn ? decider(exps, choosen, forceReturn) : found;
  }
};

const resolveProxyOptions = (selectedExperiment, middlewareOptions) => {
  const {
    sendHeaderToChild = true,
    https = false,
    headers = null
  } = middlewareOptions;

  const proxyOptions = {
    https
  };

  if (sendHeaderToChild) {
    proxyOptions["proxyReqOptDecorator"] = function (proxyReqOpts) {
      proxyReqOpts.headers["ab-decider-child"] = "true";
      return proxyReqOpts;
    };
  }
  
  if (headers) {
    proxyOptions["userResHeaderDecorator"] = function (originHeaders) {
      return {
        ...originHeaders,
        ...headers
      }
    };
  }

  return proxyOptions;
};

module.exports = decider;
module.exports.middleware = (exps, opts = {}) => [
  cookieParser(),
  (req, res, next) => {
    const {
      maxAge = 1000 * 3600 * 24 * 2,
      cookieName = DEFAULT_COOKIE_NAME,
      skip = false,
      hash = "nohash"
    } = opts;

    if (req.headers["ab-decider-child"] || skip) {
      return next();
    }

    const experiences = typeof exps == "function" ? exps() : exps;

    const experimentCookie = req.cookies[cookieName];
    const cookieValue = experimentCookie && experimentCookie.split(HASH_SPLITTER)[0];
    const cookieHash = experimentCookie && experimentCookie.split(HASH_SPLITTER)[1];
    const existingExperience = hash == cookieHash && experiences[cookieValue];
    const x = existingExperience || decider(experiences, cookieValue, true);
    const proxyOptions = resolveProxyOptions(x, opts);

    if (!existingExperience) {
      res.cookie(cookieName, `${x.name}${HASH_SPLITTER}${hash}`, { maxAge });
    }

    proxy(x.url, proxyOptions)(req, res, next);
  }
];
