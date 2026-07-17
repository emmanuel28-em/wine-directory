import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { requireRestaurantRole } from "../shared/restaurantAccess";

type BillingPortalEvent = {
  identity?: {
    sub?: string;
    username?: string;
    claims?: Record<string, unknown>;
  };
  arguments: {
    restaurantId: string;
    requestedByRole?: string;
  };
};

type StripeResponse = {
  url?: string;
  error?: {
    message?: string;
  };
};

const dynamo = new DynamoDBClient({});

function getRestaurantTableName() {
  const tableName = process.env.RESTAURANT_TABLE_NAME || "";

  if (!tableName) {
    throw new Error("Restaurant table is not configured for billing.");
  }

  return tableName;
}

async function getRestaurant(restaurantId: string) {
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: getRestaurantTableName(),
      Key: {
        id: {
          S: restaurantId
        }
      }
    })
  );

  return result.Item || null;
}

async function postToStripe(path: string, body: URLSearchParams): Promise<StripeResponse> {
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  const json = (await response.json()) as StripeResponse;

  if (!response.ok) {
    throw new Error(json.error?.message || "Stripe could not create a billing portal session.");
  }

  return json;
}

function isStripeSecretConfigured(secretKey: string) {
  return secretKey.startsWith("sk_test_") || secretKey.startsWith("sk_live_");
}

export const handler = async (event: BillingPortalEvent) => {
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  const appBaseUrl = process.env.LINE_UP_APP_BASE_URL || "";
  const { restaurantId } = event.arguments;

  if (!isStripeSecretConfigured(secretKey) || !appBaseUrl) {
    return {
      success: false,
      portalUrl: "",
      status: "notConfigured",
      error: "Stripe Billing Portal is not configured. Set STRIPE_SECRET_KEY and LINE_UP_APP_BASE_URL."
    };
  }

  try {
    await requireRestaurantRole({
      identity: event.identity,
      restaurantId,
      allowedRoles: ["owner", "admin"]
    });
    const restaurant = await getRestaurant(restaurantId);
    const stripeCustomerId = restaurant?.stripeCustomerId?.S || "";

    if (!restaurant) {
      throw new Error("Restaurant workspace was not found.");
    }

    if (!stripeCustomerId) {
      throw new Error("Set up billing before opening the billing portal.");
    }

    const cleanBaseUrl = appBaseUrl.replace(/\/$/, "");
    const body = new URLSearchParams();
    body.set("customer", stripeCustomerId);
    body.set("return_url", `${cleanBaseUrl}/manager/billing`);

    const session = await postToStripe("billing_portal/sessions", body);

    if (!session.url) {
      throw new Error("Stripe did not return a billing portal URL.");
    }

    return {
      success: true,
      portalUrl: session.url,
      status: "created",
      error: ""
    };
  } catch (error) {
    return {
      success: false,
      portalUrl: "",
      status: "failed",
      error: error instanceof Error ? error.message : "Stripe Billing Portal could not be opened."
    };
  }
};
