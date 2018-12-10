const proxy = require("express-http-proxy");
const { reduce, find } = require("lodash");
var cookieParser = require("cookie-parser");

const aWeekInMilli = 1000 * 3600 * 24 * 7;

const decider = (exps, choosen) => {
  const sumOfWeights = reduce(exps, (p, c) => p.weight + c.weight);
  if (sumOfWeights > 100) throw "Sum of weights has to be less than 100";

  // si tiene una variante elegida previamente
  if (choosen) {
    // si no existe por algún motivo se sortea de nuevo
    return exps[choosen] || decider(exps);
  } else {
    const num = Math.floor(Math.random() * 100);
    let counter = 0;
    const found = find(exps, (x, name) => {
      counter = counter + x.weight;
      return counter > num ? Object.assign(x, { name }) : false;
    });
    return found;
  }
};

exports.middleware = (exps, opts = {}) => (req, res, next) => {
  const { defaultVariantName = "original", maxAge = aWeekInMilli } = opts;
  cookieParser()(req, res, () => {
    const { iuniexp: currentExp } = req.cookies;
    const x = decider(exps, currentExp);

    if (currentExp == defaultVariantName || !x) {
      res.cookie("iuniexp", defaultVariantName, {
        maxAge
      });
      next();
    } else if(x) {
      res.cookie("iuniexp", x.name, {
        maxAge
      });
      proxy(x.url)(req, res, next);
    }else{
      next()
    }
  });
};
