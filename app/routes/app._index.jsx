import { useLoaderData, useSubmit, Link } from "react-router";
import { authenticate } from "../shopify.server";

// Common function for fetching data
async function fetchOrders(admin) {
  const response = await admin.graphql(`
    #graphql
    query getOrders {
      shop {
        name
        billingAddress {
          address1
          city
        }
      }
      orders(first: 50) {
        nodes {
          id
          name
          createdAt
          customer {
            firstName
            lastName
          }
          fulfillments(first: 1) {
            createdAt
            trackingInfo {
              number
              company
            }
          }
        }
      }
    }
  `);

  const responseJson = await response.json();

  console.log(JSON.stringify(responseJson, null, 2));

  return {
    orders: responseJson.data.orders.nodes,
    shop: responseJson.data.shop,
  };
}

// Runs automatically on page load
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  return await fetchOrders(admin);
};

// Runs when button clicked
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  return await fetchOrders(admin);
};

export default function Index() {
  const data = useLoaderData();
  const submit = useSubmit();

  return (
    <s-page heading="Order Management Dashboard">
      <ui-layout>
        <ui-card>
          <div
            style={{
              padding: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              {data?.shop && <strong>Store: {data.shop.name}</strong>}
            </div>
            <button
              style={{ ...btnBlueStyle }}
              onClick={() => submit({}, { method: "POST" })}
            >
              Fetch & Sync Orders
            </button>
          </div>
        </ui-card>

        {data?.orders && (
          <ui-card>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid #dfe3e8",
                      backgroundColor: "#f6f6f7",
                    }}
                  >
                    <th style={{ padding: "12px" }}>Order No.</th>
                    <th style={{ padding: "12px" }}>Customer Name</th>
                    <th style={{ padding: "12px" }}>Tracking No.</th>
                    <th style={{ padding: "12px" }}>Fulfillment Date</th>
                    <th style={{ padding: "12px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => {
                    const fulfillment = order.fulfillments?.[0];
                    const tracking = fulfillment?.trackingInfo?.[0];

                    return (
                      <tr
                        key={order.id}
                        style={{ borderBottom: "1px solid #dfe3e8" }}
                      >
                        <td style={{ padding: "12px" }}>
                          <strong>{order.name}</strong>
                        </td>
                        <td style={{ padding: "12px" }}>
                          {order.customer
                            ? `${order.customer.firstName} ${order.customer.lastName}`
                            : "N/A"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {tracking
                            ? `${tracking.company}: ${tracking.number}`
                            : "No Tracking"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {fulfillment
                            ? new Date(
                              fulfillment.createdAt
                            ).toLocaleDateString()
                            : "Unfulfilled"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <Link
                            to={`/app/packing-slip/${order.id
                              .split("/")
                              .pop()}`}
                            className="ui-button"
                            style={{
                              textDecoration: "none",
                              padding: "8px",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              color: "white",
                              background: "#03c109",
                            }}
                          >
                            Generate Slip
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ui-card>
        )}
      </ui-layout>
    </s-page>
  );
}

const btnBlueStyle = {
  padding: "12px",
  border: "none",
  borderRadius: "6px",
  background: "#000000",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "600",
};