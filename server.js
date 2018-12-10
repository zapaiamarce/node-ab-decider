var app = require('express')();
const {middleware:decider} = require('./index')

app.use(decider({
  cotizador: {
    weight: 90,
    url: "http://iunigo.com.ar"
  }
},{
  defaultVariantName:"default"
}), (req,res)=>res.send('original'))

app.listen(2323,()=>console.log('running on 2323'))