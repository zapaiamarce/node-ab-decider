var app = require('express')();
const {middleware:decider} = require('./index')

app.use(decider({
  cotizador: {
    weight: 40,
    url: "https://www.google.com/"
  },
  iuni: {
    weight: 20,
    url: "https://iunigo.com.ar/"
  }
},{
  defaultVariantName:"default"
}), (req,res)=>res.send('original'))

app.listen(2323,()=>console.log('running on 2323'))