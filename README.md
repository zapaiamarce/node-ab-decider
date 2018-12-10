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
  defaultVariantName:"default"
}), (req,res)=>res.send('original'))

app.listen(2323,()=>console.log('running on 2323'))
```

Same logic but, it uses cookies to get the choosen or set the cookie.