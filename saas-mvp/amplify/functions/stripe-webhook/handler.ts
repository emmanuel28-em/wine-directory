import { createHmac, timingSafeEqual } from "crypto";
import { DynamoDBClient, ScanCommand, UpdateItemCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";

type LambdaUrlEvent = {
  body?: string;
  isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>;
};

type StripeEvent = {
  type: string;
  data: {
    object: Record<string, any>;
  };
};

type RestaurantLookup = {
  restaurantId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
};

const dynamo = new DynamoDBClient({});

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

function getHeader(headers: LambdaUrlEvent["headers"], name: string) {
  const foundKey = Object.keys(headers || {}).find((key) => key.toLowerCase() === name.toLowerCase());
  return foundKey ? headers?.[foundKey] || "" : "";
}

function getPayload(event: LambdaUrlEvent) {
  const body = event.body || "";
  return event.isBase64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
}

function verifyStripeSignature({ payload, signatureHeader, webhookSecret }: { payload: string; signatureHeader: string; webhookSecret: string }) {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((item) => {
      const [key, value] = item.split("=");
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const expectedSignature = parts.v1;

  if (!timestamp || !expectedSignature) {
    return false;
  }

  const timestampMs = Number(timestamp) * 1000;
  const fiveMinutesMs = 5 * 60 * 1000;

  if (Number.isNaN(timestampMs) || Math.abs(Date.now() - timestampMs) > fiveMinutesMs) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const actualSignature = createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
  const actual = Buffer.from(actualSignature);
  const expected = Buffer.from(expectedSignature);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function getRestaurantTableName() {
  const tableName = process.env.RESTAURANT_TABLE_NAME || "";

  if (!tableName) {
    throw new Error("Restaurant table is not configured for Stripe webhooks.");
  }

  return tableName;
}

function getString(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && "id" in value) {
    return String((value as { id?: string }).id || "");
  }

  return "";
}

function toIsoFromUnix(value: unknown) {
  if (typeof value !== "number" || value <= 0) {
    return "";
  }

  return new Date(value * 1000).toISOString();
}

function normalizeSubscriptionStatus(value: string) {
  const allowed = new Set(["trialing", "active", "past_due", "canceled", "paused", "unpaid", "incomplete"]);

  if (allowed.has(value)) {
    return value;
  }

  if (value === "incomplete_expired") {
    return "incomplete";
  }

  return "";
}

async function findRestaurantByStripeField(fieldName: "stripeCustomerId" | "stripeSubscriptionId", value: string) {
  if (!value) {
    return "";
  }

  let exclusiveStartKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: getRestaurantTableName(),
        FilterExpression: `${fieldName} = :value`,
        ExpressionAttributeValues: {
          ":value": {
            S: value
          }
        },
        ExclusiveStartKey: exclusiveStartKey
      })
    );

    if (result.Items?.[0]?.id?.S) {
      return result.Items[0].id.S;
    }

    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return "";
}

async function findRestaurantId({ restaurantId, stripeCustomerId, stripeSubscriptionId }: RestaurantLookup) {
  if (restaurantId) {
    return restaurantId;
  }

  const byCustomer = await findRestaurantByStripeField("stripeCustomerId", stripeCustomerId || "");

  if (byCustomer) {
    return byCustomer;
  }

  return findRestaurantByStripeField("stripeSubscriptionId", stripeSubscriptionId || "");
}

function getLookupFromStripeObject(object: Record<string, any>): RestaurantLookup {
  const metadataRestaurantId =
    object.metadata?.restaurantId ||
    object.subscription_details?.metadata?.restaurantId ||
    object.parent?.subscription_details?.metadata?.restaurantId ||
    "";

  return {
    restaurantId: metadataRestaurantId,
    stripeCustomerId: getString(object.customer),
    stripeSubscriptionId: getString(object.subscription || object.id)
  };
}

function getBillingFields(type: string, object: Record<string, any>) {
  const isSubscriptionEvent = type.startsWith("customer.subscription.");
  const rawStatus =
    type === "invoice.payment_failed"
      ? "past_due"
      : type === "invoice.payment_succeeded"
        ? "active"
        : isSubscriptionEvent
          ? object.status || ""
          : "";
  const status = normalizeSubscriptionStatus(rawStatus);

  return {
    stripeCustomerId: getString(object.customer),
    stripeSubscriptionId: isSubscriptionEvent ? getString(object.id) : getString(object.subscription),
    subscriptionStatus: status,
    currentPeriodEnd: toIsoFromUnix(object.current_period_end || object.lines?.data?.[0]?.period?.end),
    trialEndsAt: toIsoFromUnix(object.trial_end),
    billingEmail: object.customer_email || object.customer_details?.email || object.billing_email || "",
    plan: object.plan?.nickname || object.items?.data?.[0]?.price?.nickname || object.items?.data?.[0]?.price?.id || "monthly"
  };
}

async function updateRestaurantBilling(restaurantId: string, fields: ReturnType<typeof getBillingFields>) {
  const names: Record<string, string> = {};
  const values: Record<string, { S: string }> = {};
  const setters: string[] = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    names[`#${key}`] = key;
    values[`:${key}`] = {
      S: value
    };
    setters.push(`#${key} = :${key}`);
  });

  if (setters.length === 0) {
    return;
  }

  await dynamo.send(
    new UpdateItemCommand({
      TableName: getRestaurantTableName(),
      Key: {
        id: {
          S: restaurantId
        }
      },
      UpdateExpression: `SET ${setters.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values
    })
  );
}

export const handler = async (event: LambdaUrlEvent) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const signatureHeader = getHeader(event.headers, "stripe-signature");
  const payload = getPayload(event);

  if (!webhookSecret.startsWith("whsec_")) {
    return jsonResponse(500, {
      received: false,
      error: "Stripe webhook secret is not configured."
    });
  }

  if (!verifyStripeSignature({ payload, signatureHeader, webhookSecret })) {
    return jsonResponse(400, {
      received: false,
      error: "Invalid Stripe webhook signature."
    });
  }

  const stripeEvent = JSON.parse(payload) as StripeEvent;
  const handledEvents = new Set([
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_failed",
    "invoice.payment_succeeded"
  ]);

  if (!handledEvents.has(stripeEvent.type)) {
    return jsonResponse(200, {
      received: true,
      ignored: true
    });
  }

  const stripeObject = stripeEvent.data.object;
  const lookup = getLookupFromStripeObject(stripeObject);
  const restaurantId = await findRestaurantId(lookup);

  if (!restaurantId) {
    return jsonResponse(200, {
      received: true,
      warning: "No matching restaurant was found for this Stripe event."
    });
  }

  await updateRestaurantBilling(restaurantId, getBillingFields(stripeEvent.type, stripeObject));

  return jsonResponse(200, {
    received: true
  });
};
