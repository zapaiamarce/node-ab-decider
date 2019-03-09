import test from "ava";
import decider from ".";
import { times, countBy, mapValues } from "lodash";
import server from "./server"
import cookie from "cookie"
require("isomorphic-fetch");

test.before(async t => {
	await server.on('listened', () => Promise.resolve())
});

const generateAB = (percentage) => {
  const total = 10000;
  const testExp = {
    a: {
      url: "http://",
      weight: percentage
    },
    b: {
      url: "http://",
      weight: 100 - percentage
    }
  };
  let hitsCounter = 0;
  for (let counter = 0; counter < total; counter++) {
    if (decider(testExp).name == "a") hitsCounter++;
  }
  return hitsCounter;
}

const generateHitsTest = t => (percentage) => {
  const expectedHits = percentage * 100;
  const exactHits = generateAB(percentage);
  
  t.truthy(
    exactHits > expectedHits * 0.90 &&
    exactHits < expectedHits * 1.1
  );
}

test("weights work properly in the decider process", t => {
  t.plan(4);
  generateHitsTest(t)(80)
  generateHitsTest(t)(20)
  generateHitsTest(t)(5)
  generateHitsTest(t)(3)
});

const generateNHits = (t) => (hits) => times(hits, async () => {
  const res = await fetch(server.hostname)
  
  const setCookieHeader = res.headers.get('set-cookie')
  const variantCookie = decodeURIComponent(cookie.parse(setCookieHeader).variant)
  const responseExperimentName = variantCookie.split("@")[0]
  const responseExperimentHash = variantCookie.split("@")[1]
  return responseExperimentName
})

test("decider server balance weight correctly", async t => {
  const HITS_PER_PAGE = 100;
  const PAGES = 20;
  const TOTAL_HITS = HITS_PER_PAGE * PAGES;
  let responses = []
  for (let t = 0; t < PAGES; t++) {
    const newReponses = await Promise.all(generateNHits(t)(HITS_PER_PAGE))
    responses = responses.concat(newReponses)
  }
  const totals = countBy(responses)

  const percentages = mapValues(totals, t => t * 100 / TOTAL_HITS)

  t.log(percentages)
  t.truthy(true)
});