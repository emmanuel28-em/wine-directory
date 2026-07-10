import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

type CheckoutEvent = {
  arguments: {
    restaurantId: string;
    restaurantName: string;
    billingEmail: string;
    stripeCustomerId?: string;
    trialEndsAt?: string;
    requestedByRole?: string;
  };
};

type StripeResponse = {
  id?: string;
  url?: string;
  error?: {
    message?: string;
  };
};

function getTrialEndUnix(trialEndsAt?: string) {
  if (!trialEndsAt) {
    return "";
  }

  const trialDate = new Date(trialEndsAt);

  if (Number.isNaN(trialDate.getTime()) || trialDate <= new Date()) {
    return "";
  }

  return String(Math.floor(trialDate.getTime() / 1000));
}

const dynamo = new DynamoDBClient({});

function isOwnerOrAdmin(role?: string) {
  return role === "owner" || role === "admin";
}

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

async function saveCustomerId({ restaurantId, stripeCustomerId, billingEmail }: { restaurantId: string; stripeCustomerId: string; billingEmail: string }) {
  await dynamo.send(
    new UpdateItemCommand({
      TableName: getRestaurantTableName(),
      Key: {
        id: {
          S: restaurantId
        }
      },
      UpdateExpression: "SET stripeCustomerId = :customerId, billingEmail = :billingEmail, subscriptionStatus = if_not_exists(subscriptionStatus, :trialing)",
      ExpressionAttributeValues: {
        ":customerId": {
          S: stripeCustomerId
        },
        ":billingEmail": {
          S: billingEmail
        },
        ":trialing": {
          S: "trialing"
        }
      }
    })
  );
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
    throw new Error(json.error?.message || "Stripe could not complete this request.");
  }

  return json;
}

async function createStripeCustomer({ restaurantId, restaurantName, billingEmail }: CheckoutEvent["arguments"]) {
  const body = new URLSearchParams();
  body.set("email", billingEmail);
  body.set("name", restaurantName);
  body.set("metadata[restaurantId]", restaurantId);

  const customer = await postToStripe("customers", body);

  if (!customer.id) {
    throw new Error("Stripe did not return a customer id.");
  }

  return customer.id;
}

async function updateStripeCustomerMetadata(customerId: string, restaurantId: string) {
  const body = new URLSearchParams();
  body.set("metadata[restaurantId]", restaurantId);
  await postToStripe(`customers/${customerId}`, body);
}

export const handler = async (event: CheckoutEvent) => {
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY || "";
  const appBaseUrl = process.env.LINE_UP_APP_BASE_URL || "";
  const { restaurantId, restaurantName, billingEmail, stripeCustomerId, trialEndsAt, requestedByRole } = event.arguments;

  if (!secretKey || !priceId || !appBaseUrl) {
    return {
      success: false,
      checkoutUrl: "",
      stripeCustomerId: stripeCustomerId || "",
      status: "notConfigured",
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY, STRIPE_PRICE_ID_MONTHLY, and LINE_UP_APP_BASE_URL."
    };
  }

  if (!isOwnerOrAdmin(requestedByRole)) {
    return {
      success: false,
      checkoutUrl: "",
      stripeCustomerId: stripeCustomerId || "",
      status: "forbidden",
      error: "Only Account Owners and Admins can set up billing."
    };
  }

  if (!restaurantId || !restaurantName || !billingEmail) {
    return {
      success: false,
      checkoutUrl: "",
      stripeCustomerId: stripeCustomerId || "",
      status: "failed",
      error: "Billing setup is missing restaurant or billing contact information."
    };
  }

  try {
    const restaurant = await getRestaurant(restaurantId);

    if (!restaurant) {
      throw new Error("Restaurant workspace was not found.");
    }

    const savedCustomerId = restaurant.stripeCustomerId?.S || "";
    const customerId = stripeCustomerId || savedCustomerId || (await createStripeCustomer(event.arguments));
    await updateStripeCustomerMetadata(customerId, restaurantId);
    await saveCustomerId({ restaurantId, stripeCustomerId: customerId, billingEmail });

    const checkoutBody = new URLSearchParams();
    const cleanBaseUrl = appBaseUrl.replace(/\/$/, "");
    const trialEndUnix = getTrialEndUnix(trialEndsAt);

    checkoutBody.set("mode", "subscription");
    checkoutBody.set("customer", customerId);
    checkoutBody.set("client_reference_id", restaurantId);
    checkoutBody.set("line_items[0][price]", priceId);
    checkoutBody.set("line_items[0][quantity]", "1");
    checkoutBody.set("success_url", `${cleanBaseUrl}/manager/billing?checkout=success`);
    checkoutBody.set("cancel_url", `${cleanBaseUrl}/manager/billing?checkout=cancelled`);
    checkoutBody.set("metadata[restaurantId]", restaurantId);
    checkoutBody.set("subscription_data[metadata][restaurantId]", restaurantId);

    if (trialEndUnix) {
      checkoutBody.set("subscription_data[trial_end]", trialEndUnix);
    }

    const session = await postToStripe("checkout/sessions", checkoutBody);

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return {
      success: true,
      checkoutUrl: session.url,
      stripeCustomerId: customerId,
      status: "created",
      error: ""
    };
  } catch (error) {
    return {
      success: false,
      checkoutUrl: "",
      stripeCustomerId: stripeCustomerId || "",
      status: "failed",
      error: error instanceof Error ? error.message : "Stripe Checkout could not be created."
    };
  }
};
