const app = require("express")();
const { middleware: decider } = require("./index");
const port = process.env.PORT || 2323;

const LOCALHOST = 'http://localhost:2323'

const resource = () => ({
  a: {
    url: LOCALHOST + "/a",
    weight: 70
  },
  b: {
    url: LOCALHOST + "/b",
    weight: 20
  },
  c: {
    url: LOCALHOST + "/c",
    weight: 10
  }
});

app.get("/test", (req, res) => res.send("ok"))
app.get("/a", (req, res) => res.send("a"))
app.get("/b", (req, res) => res.send("b"))
app.get("/c", (req, res) => res.send("c"))

app.use(
  decider(resource, {
    hash: 123,
    https: true,
  })
);

app.listen(port, () => console.log(`running on ${port}`));

app.resource = resource;
app.hostname = LOCALHOST;

module.exports = app;
