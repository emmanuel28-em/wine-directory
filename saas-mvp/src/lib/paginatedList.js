// Amplify Data returns list results one page at a time. Keep following nextToken
// so a growing restaurant library never appears incomplete after 100 records.
export async function listAllRecords(model, options = {}) {
  const records = [];
  const seenTokens = new Set();
  let nextToken;

  do {
    const result = await model.list({
      ...options,
      ...(nextToken ? { nextToken } : {})
    });

    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join(" "));
    }

    records.push(...(result.data || []));
    nextToken = result.nextToken || undefined;

    // A repeated token would otherwise create an endless request loop.
    if (nextToken && seenTokens.has(nextToken)) {
      throw new Error("Could not finish loading all records. Please refresh and try again.");
    }

    if (nextToken) seenTokens.add(nextToken);
  } while (nextToken);

  return records;
}
