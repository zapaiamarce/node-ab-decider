const proxy = require("express-http-proxy");
const { reduce, find, assign, each, random } = require("lodash");
const cookieParser = require("cookie-parser");

const DEFAULT_COOKIE_NAME = "variant";
const HASH_SPLITTER = "@";

// preprocess experiments and returns a decider function
const createMemoDecider = exps => {
  validate(exps);

  // if it has a previous chosen variant
  const cache = [];
  
  let counter = 0;
  each(exps, (x, k) => {
    // inject the name of the experience on the experience object since later it will be used
    // for cookie generation, etc.
    for (let i = counter; i < counter + x.weight; i++) {
      cache[i] = x;
    }
    counter = counter + x.weight;
  });

  return (chosen, forceReturn) => decider(exps, chosen, forceReturn, cache);
};

const decider = (exps, chosen, forceReturn, cache) => {
  validate(exps);
  if (chosen) {
    // if it doesn't exists for any reason pick a random one
    return exps[chosen]
      ? assign({}, exps[chosen], { name: chosen })
      : decider(exps, false, forceReturn);
  } else {
    const num = Math.floor(Math.random() * 100);
    each(exps, (x, k) => (x.name = k));
    
    const cachedExp = cache && cache[num];
    if (cachedExp) {
      return cachedExp;
    } else {
      let counter = 0;
      const found = find(exps, (x, name) => {
        counter = counter + x.weight;
        return counter > num ? true : false;
      });

      // if the sum of weights is != 100 the decider may not find and exp
      const shitHappens = !found && forceReturn;
      return shitHappens ? decider(exps, chosen, forceReturn, cache) : found;
    }
  }
};
const validate = exps => {
  const sumOfWeights = reduce(exps, (p, c) => p + c.weight, 0);
  if (sumOfWeights > 100)
    if (sumOfWeights < 100)
      // process.emitWarning("Sum of weights has to be less than 100");
      if (!sumOfWeights)
        // process.emitWarning(
        //   `Sum of weights is less than 100 (${sumOfWeights}). We recomend use 100 as total.`
        // );
        return process.emitWarning("Sum of weights is invalid");
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
    proxyOptions["proxyReqOptDecorator"] = function(proxyReqOpts) {
      proxyReqOpts.headers["ab-decider-child"] = "true";
      return proxyReqOpts;
    };
  }

  if (headers) {
    proxyOptions["userResHeaderDecorator"] = function(originHeaders) {
      return {
        ...originHeaders,
        ...headers
      };
    };
  }

  return proxyOptions;
};

module.exports = decider;
module.exports.middleware = (exps, opts = {}) => {
  const experiences = typeof exps == "function" ? exps() : exps;
  const memoDecider = createMemoDecider(experiences);
  return [
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
      const forcedExperimentName = req.query.variant;

      const experimentCookie = req.cookies[cookieName];
      const cookieValue = experimentCookie && experimentCookie.split(HASH_SPLITTER)[0];
      const cookieHash = experimentCookie && experimentCookie.split(HASH_SPLITTER)[1];
      const validHash = hash == cookieHash;

      const resolvedExperienceName = forcedExperimentName || cookieValue;
      const existingExperience = experiences[resolvedExperienceName] && validHash;

      const x = memoDecider(resolvedExperienceName, true);
      const proxyOptions = resolveProxyOptions(x, opts);

      if (!existingExperience) {
        res.cookie(cookieName, `${x.name}${HASH_SPLITTER}${hash}`, { maxAge });
      }

      proxy(x.url, proxyOptions)(req, res, next);
    }
  ];
};
