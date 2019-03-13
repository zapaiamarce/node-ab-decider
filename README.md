[![CircleCI](https://circleci.com/gh/zapaiamarce/node-ab-decider.svg?style=svg)](https://circleci.com/gh/zapaiamarce/node-ab-decider)

## Setup

```sh
npm install node-ab-decider
```

## Use

```js
const decider = require('node-ab-decider')
const choosen = "oldVariant"
const experiments = {
  variantA: {
    weight: 10,
    url: "https://exp-a.example.com/"
  },
  variantB: {
    weight: 20,
    url: "https://exp-b.example.com/"
  }
}
const x = decider(experiments, choosen)
// possible "x" value: {weight: 10, name:"variantA", url: "https://exp-a.example.com/"}
```

**NOTE:** If `choosen` is present the experiments object 
it doesn't run the choosing algorithm. If it's not present it re-run 
the process.


## With Express

```js
var app = require('express')();
const {middleware} = require('node-ab-decider')

const experiments = {
  variantA: {
    weight: 10,
    url: "https://exp-a.example.com/"
  },
  variantB: {
    weight: 20,
    url: "https://exp-b.example.com/"
  }
}

app.use(middleware(experiments, {
  // ...opts
}), (req,res)=>res.send('original'))

app.listen(2323,()=>console.log('running on 2323'))
```

Same logic but, it uses cookies to get the choosen or set the cookie.

# Middleware options

### maxAge
Expiration (in milliseconds) of the cookie

### cookieName
Name of the cookie used to save the choosen exp

### skip
Skip this middleware. Useful in dev mode.

### hash
Hash added to the cookie. It is something like a version.

### sendHeaderToChild
If false it avoids to send "ab-decider-child" header to the proxied endpoint

### https
Force https to children

### headers
Headers to include in every response
