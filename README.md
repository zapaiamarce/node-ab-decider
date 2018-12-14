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
console.log(x)
// possible "x" value: {weight: 10, name:"variantA", url: "https://exp-a.example.com/"}
// or undefined
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
  defaultVariantName:"default",
  // ...opts
}), (req,res)=>res.send('original'))

app.listen(2323,()=>console.log('running on 2323'))
```

Same logic but, it uses cookies to get the choosen or set the cookie.

# Middleware options

### defaultVariantName
Name of the variant when none of the exps where choosen.

### maxAge
Expiration (in milliseconds) of the cookie

### cookieName
Name of the cookie used to save the choosen exp

### skip
Skip this middleware. Useful in dev mode.

### avoidDefault
if true it force to choose an option between the experiments,
event if they doesn´t sum 100

### encodeCookie
Use btoa to encode the cookie value

### sendHeaderToChild
If false it avoids to send "ab-decider-child" header to the proxied endpoint