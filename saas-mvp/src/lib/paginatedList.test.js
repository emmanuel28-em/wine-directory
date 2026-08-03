import assert from "node:assert/strict";
import test from "node:test";
import { listAllRecords } from "./paginatedList.js";

test("loads every page returned by Amplify Data", async () => {
  const calls = [];
  const model = {
    async list(options) {
      calls.push(options);

      if (!options.nextToken) {
        return { data: [{ id: "first" }], nextToken: "page-two" };
      }

      return { data: [{ id: "second" }], nextToken: null };
    }
  };

  const records = await listAllRecords(model, { filter: { restaurantId: { eq: "restaurant-1" } } });

  assert.deepEqual(records.map((record) => record.id), ["first", "second"]);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].nextToken, "page-two");
});

test("stops and reports Amplify Data errors", async () => {
  const model = {
    async list() {
      return { data: [], errors: [{ message: "Not authorized" }] };
    }
  };

  await assert.rejects(() => listAllRecords(model), /Not authorized/);
});
