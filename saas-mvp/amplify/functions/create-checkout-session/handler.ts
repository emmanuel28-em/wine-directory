import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { requireRestaurantRole } from "../shared/restaurantAccess";

type CheckoutEvent = {
  identity?: {
    sub?: string;
    username?: string;
    claims?: Record<string, unknown>;
  };
  arguments: {
    restaurantId: string;
    restaurantName: string;
    billingEmail: string;
    stripeCustomerId?: string;
    trialEndsAt?: string;
    requestedByRole?: string;
    selectedPlan?: string;
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

  const minimumTrialEnd = Date.now() + 48 * 60 * 60 * 1000;

  if (Number.isNaN(trialDate.getTime()) || trialDate.getTime() < minimumTrialEnd) {
    return "";
  }

  return String(Math.floor(trialDate.getTime() / 1000));
}

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

function getPlanPriceId(selectedPlan?: string) {
  const plan = selectedPlan === "growth" || selectedPlan === "pro" ? selectedPlan : "starter";

  if (plan === "growth") return process.env.STRIPE_PRICE_ID_GROWTH || "";
  if (plan === "pro") return process.env.STRIPE_PRICE_ID_PRO || "";

  return process.env.STRIPE_PRICE_ID_STARTER || process.env.STRIPE_PRICE_ID_MONTHLY || "";
}

async function saveBillingSetup({
  restaurantId,
  stripeCustomerId,
  billingEmail,
  selectedPlan
}: {
  restaurantId: string;
  stripeCustomerId: string;
  billingEmail: string;
  selectedPlan: string;
}) {
  await dynamo.send(
    new UpdateItemCommand({
      TableName: getRestaurantTableName(),
      Key: {
        id: {
          S: restaurantId
        }
      },
      UpdateExpression: "SET stripeCustomerId = :customerId, billingEmail = :billingEmail, #plan = :plan, subscriptionStatus = if_not_exists(subscriptionStatus, :trialing)",
      ExpressionAttributeNames: {
        "#plan": "plan"
      },
      ExpressionAttributeValues: {
        ":customerId": {
          S: stripeCustomerId
        },
        ":billingEmail": {
          S: billingEmail
        },
        ":plan": {
          S: selectedPlan
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

function isStripeSecretConfigured(secretKey: string) {
  // A placeholder secret lets the backend deploy before the founder connects Stripe,
  // but it must never be treated as a real Stripe credential.
  return secretKey.startsWith("sk_test_") || secretKey.startsWith("sk_live_");
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
  const selectedPlan = event.arguments.selectedPlan === "growth" || event.arguments.selectedPlan === "pro" ? event.arguments.selectedPlan : "starter";
  const priceId = getPlanPriceId(selectedPlan);
  const appBaseUrl = process.env.LINE_UP_APP_BASE_URL || "";
  const { restaurantId, stripeCustomerId } = event.arguments;

  if (!isStripeSecretConfigured(secretKey) || !priceId.startsWith("price_") || !appBaseUrl) {
    return {
      success: false,
      checkoutUrl: "",
      stripeCustomerId: stripeCustomerId || "",
      status: "notConfigured",
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY, STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_GROWTH, STRIPE_PRICE_ID_PRO, and LINE_UP_APP_BASE_URL."
    };
  }

  if (!restaurantId) {
    return {
      success: false,
      checkoutUrl: "",
      stripeCustomerId: stripeCustomerId || "",
      status: "failed",
      error: "Billing setup is missing restaurant or billing contact information."
    };
  }

  try {
    await requireRestaurantRole({
      identity: event.identity,
      restaurantId,
      allowedRoles: ["owner"]
    });
    const restaurant = await getRestaurant(restaurantId);

    if (!restaurant) {
      throw new Error("Restaurant workspace was not found.");
    }

    const restaurantName = restaurant.name?.S || "Restaurant";
    const billingEmail = restaurant.billingEmail?.S || restaurant.primaryContactEmail?.S || "";

    if (!billingEmail) {
      throw new Error("Add a billing email before setting up billing.");
    }

    const savedCustomerId = restaurant.stripeCustomerId?.S || "";
    const customerId = savedCustomerId || (await createStripeCustomer({ restaurantId, restaurantName, billingEmail }));
    await updateStripeCustomerMetadata(customerId, restaurantId);
    await saveBillingSetup({ restaurantId, stripeCustomerId: customerId, billingEmail, selectedPlan });

    const checkoutBody = new URLSearchParams();
    const cleanBaseUrl = appBaseUrl.replace(/\/$/, "");
    const trialEndUnix = getTrialEndUnix(restaurant.trialEndsAt?.S);

    checkoutBody.set("mode", "subscription");
    checkoutBody.set("customer", customerId);
    checkoutBody.set("payment_method_collection", "always");
    checkoutBody.set("client_reference_id", restaurantId);
    checkoutBody.set("line_items[0][price]", priceId);
    checkoutBody.set("line_items[0][quantity]", "1");
    checkoutBody.set("success_url", `${cleanBaseUrl}/manager/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    checkoutBody.set("cancel_url", `${cleanBaseUrl}/manager/billing?checkout=cancelled`);
    checkoutBody.set("metadata[restaurantId]", restaurantId);
    checkoutBody.set("metadata[selectedPlan]", selectedPlan);
    checkoutBody.set("subscription_data[metadata][restaurantId]", restaurantId);
    checkoutBody.set("subscription_data[metadata][selectedPlan]", selectedPlan);
    checkoutBody.set("subscription_data[trial_settings][end_behavior][missing_payment_method]", "cancel");

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
