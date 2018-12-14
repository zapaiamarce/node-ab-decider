const app = require("express")();
const { middleware: decider } = require("./index");
const port = process.env.PORT || 2323;

const resource = () => {
  return {
    cotizador: {
      weight: 50,
      url: "http://localhost:3434"
    }
  };
};

app.use(
  decider(resource, {}),
  (req, res) => res.send(`port ${port}`)
);

app.listen(port, () => console.log(`running on ${port}`));
