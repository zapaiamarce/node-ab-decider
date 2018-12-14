const app = require("express")();
const { middleware: decider } = require("./index");
const port = process.env.PORT || 2323;

const resource = () => {
  return {
    cotizador: {
      weight: 10,
      url: "https://www.google.com/"
    },
    alalla: {
      weight: 10,
      url: "https://www.google.com/"
    }
  };
};

app.get("/test", (req, res)=>res.send("ok"))

app.use(
  decider(resource, {
    avoidDefault: true,
    encodeCookie: true
  })
);

app.listen(port, () => console.log(`running on ${port}`));
