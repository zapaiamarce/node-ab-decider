const proxy = require("express-http-proxy");
const { reduce, find, assign, each } = require("lodash");
const cookieParser = require("cookie-parser");

const DEFAULT_COOKIE_NAME = "variant" 

const decider = (exps, choosen) => {
  const sumOfWeights = reduce(exps, (p, c) => p.weight + c.weight);
  if (sumOfWeights > 100) throw "Sum of weights has to be less than 100";

  // si tiene una variante elegida previamente
  if (choosen) {
    // si no existe por algún motivo se sortea de nuevo
    return exps[choosen]
      ? assign({}, exps[choosen], { name: choosen })
      : decider(exps);
  } else {
    const num = Math.floor(Math.random() * 100);
    each(exps, (x, k) => (x.name = k));
    let counter = 0;
    const found = find(exps, (x, name) => {
      counter = counter + x.weight;
      return counter > num ? true : false;
    });
    return found;
  }
};

const resolveProxyOptions = (selectedExperiment, middlewareOptions) => {
  const {
    cookieName = DEFAULT_COOKIE_NAME,
    sendCookieToChild = true
  } = middlewareOptions;

  const options = {}

  if(sendCookieToChild){
    options["proxyReqOptDecorator"] = function(proxyReqOpts) {
      proxyReqOpts.headers[cookieName] = selectedExperiment.name;
      proxyReqOpts.headers["ab-decider-child"] = "true";
      return proxyReqOpts;
    }
  }

  return options
}

exports.middleware = (exps, opts = {}) => [
  cookieParser(),
  (req, res, next) => {
    const {
      defaultVariantName = "original",
      maxAge = 1000 * 3600 * 24 * 7,
      cookieName = DEFAULT_COOKIE_NAME,
      skip = false
    } = opts;
    
    if (req.headers["ab-decider-child"] || skip) {
      return next();
    }

    const thisReqVariant = req.cookies[cookieName];
    const experiences = typeof exps == "function" ? exps() : exps;
    console.log(experiences);
    if (thisReqVariant == defaultVariantName) {
      next();
    } else {
      const x = decider(experiences, thisReqVariant);
      const proxyOptions = resolveProxyOptions(x, opts)

      if (x) {
        res.cookie(cookieName, x.name, { maxAge });
        proxy(x.url, proxyOptions)(req, res, next);
      } else {
        res.cookie(cookieName, defaultVariantName, { maxAge });
        next();
      }
    }
  }
];
