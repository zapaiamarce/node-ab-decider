const proxy = require("express-http-proxy");
const { reduce, find, assign, each, random } = require("lodash");
const cookieParser = require("cookie-parser");

const DEFAULT_COOKIE_NAME = "variant";
const HASH_SPLITTER = "@"

// preprocess experiments and returns a decider function
const createDecider = (exps) => {
  const experiences = typeof exps == "function" ? exps() : exps;

  // an array that stores the distribution of experiences in a way it is faster to access
  const expsDist = [];

  validate(experiences);

  let counter = 0;
  each(experiences, (x, k) => {
    for(let i = counter; i < counter + x.weight; i++) {
      expsDist[i] = x;
    }
    counter = counter + x.weight;
  });

  const decide = (exps, expsDist, chosen, forceReturn) => {
    // si tiene una variante elegida previamente
    if (chosen) {
      // si no existe por algún motivo se sortea de nuevo sin el chosen
      return exps[chosen]
        ? assign({}, exps[chosen], { name: chosen })
        : decide(exps, expsDist, false, forceReturn);
    } else {
      const num = Math.floor(Math.random() * 100);
      let found = expsDist[num];
      return !found && forceReturn ? decide(exps, expsDist, chosen, forceReturn) : found;
    }
  }

  return (req, res, next) => {
    req.decide = (chosen, forceReturn) => {
      return decide(experiences, expsDist, chosen, forceReturn);
    }
    next();
  }
}


const validate = (exps) => {
  const sumOfWeights = reduce(exps, (p, c) => p + c.weight, 0);
  if (sumOfWeights > 100)
    process.emitWarning("Sum of weights has to be less than 100");
  if (sumOfWeights < 100)
    process.emitWarning(
      `Sum of weights is less than 100 (${sumOfWeights}). We recomend use 100 as total.`
    );
  if (!sumOfWeights) return process.emitWarning("Sum of weights is invalid");
}

const decider = (exps, chosen, forceReturn) => {
  validate(exps);
  // si tiene una variante elegida previamente
  if (chosen) {
    // si no existe por algún motivo se sortea de nuevo sin el chosen
    return exps[chosen]
      ? assign({}, exps[chosen], { name: chosen })
      : decider(exps, false, forceReturn);
  } else {
    const num = Math.floor(Math.random() * 100);
    each(exps, (x, k) => (x.name = k));
    let counter = 0;
    const found = find(exps, (x, name) => {
      counter = counter + x.weight;
      return counter > num ? true : false;
    });

    return !found && forceReturn ? decider(exps, chosen, forceReturn) : found;
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
  createDecider(exps),
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
    const resolvedExperienceName = forcedExperimentName || cookieValue;
    const validHash = hash == cookieHash;
    const existingExperience = !forcedExperimentName && validHash && experiences[cookieValue];
    
    const x = existingExperience || req.decide(resolvedExperienceName, true);
    const proxyOptions = resolveProxyOptions(x, opts); 
    
    if (!existingExperience) {
      res.cookie(cookieName, `${x.name}${HASH_SPLITTER}${hash}`, { maxAge });
    }

    proxy(x.url, proxyOptions)(req, res, next);
  }
];
