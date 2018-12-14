const proxy = require("express-http-proxy");
const { reduce, find, assign, each } = require("lodash");
const cookieParser = require("cookie-parser");
const atob = require("atob");
const btoa = require("btoa");

const DEFAULT_COOKIE_NAME = "variant";

const decider = (exps, choosen, forceReturn) => {
  const sumOfWeights = reduce(exps, (p, c) => p.weight + c.weight);
  if (sumOfWeights > 100) console.error("Sum of weights has to be less than 100");

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
    cookieName = DEFAULT_COOKIE_NAME,
    sendHeaderToChild = true
  } = middlewareOptions;

  const options = {};

  if (sendHeaderToChild) {
    options["proxyReqOptDecorator"] = function(proxyReqOpts) {
      proxyReqOpts.headers[cookieName] = selectedExperiment.name;
      proxyReqOpts.headers["ab-decider-child"] = "true";
      return proxyReqOpts;
    };
  }

  return options;
};

exports.middleware = (exps, opts = {}) => [
  cookieParser(),
  (req, res, next) => {
    const {
      defaultVariantName = "original",
      maxAge = 1000 * 3600 * 24 * 7,
      cookieName = DEFAULT_COOKIE_NAME,
      skip = false,
      avoidDefault = false,
      encodeCookie = false
    } = opts;

    if (req.headers["ab-decider-child"] || skip) {
      return next();
    }

    const thisReqVariantRaw = req.cookies[cookieName];
    const thisReqVariant = (encodeCookie && thisReqVariantRaw) ? atob(thisReqVariantRaw) : thisReqVariantRaw;
    
    const experiences = typeof exps == "function" ? exps() : exps;

    // avoid default fuerza a que un experimento sea elegido,
    // nunca se ejecuta el next
    if (!avoidDefault && thisReqVariant == defaultVariantName) {
      next();
    } else {
      const x = decider(experiences, thisReqVariant, avoidDefault);
      const proxyOptions = resolveProxyOptions(x, opts);

      const cookieValueRaw = x ? x.name : defaultVariantName;
      
      const cookieValue = encodeCookie
        ? btoa(cookieValueRaw)
        : cookieValueRaw;
      res.cookie(cookieName, cookieValue, { maxAge });

      if (x) {
        proxy(x.url, proxyOptions)(req, res, next);
      } else {
        next();
      }
    }
  }
];
