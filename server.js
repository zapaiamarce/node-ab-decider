const app = require("express")();
const { middleware: decider } = require("./index");
const port = process.env.PORT || 2323;
const nocache = require('nocache')

const resource = () => {
  return {
    cotizador: {
      weight: 5,
      url: "http://mainstream.iunigo.com.ar"
    },
    alalla: {
      weight: 80,
      url: "http://mainstream.iunigo.com.ar"
    }
  };
};

app.get("/test", (req, res) => res.send("ok"))

app.use(
  decider(resource, {
    hash: 123,
    https: true,
  })
);

app.listen(port, () => console.log(`running on ${port}`));
