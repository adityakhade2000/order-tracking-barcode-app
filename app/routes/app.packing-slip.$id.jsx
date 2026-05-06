import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

// Using the specific import path you requested
import Barcode from "react-barcode/lib/react-barcode";

export const loader = async ({ request, params }) => {
    const { admin } = await authenticate.admin(request);
    const orderId = `gid://shopify/Order/${params.id}`;

    const response = await admin.graphql(`
    #graphql
    query getOrder($id: ID!) {
      shop {
        name
        billingAddress { address1 city provinceCode zip }
      }
      order(id: $id) {
        name
        createdAt
        customer { firstName lastName }
        shippingAddress { address1 city provinceCode zip firstName lastName }
        lineItems(first: 10) {
          nodes { title sku quantity }
        }
        fulfillments(first: 1) {
          trackingInfo(first: 1) { number }
        }
      }
    }
  `, { variables: { id: orderId } });

    const { data } = await response.json();
    return { order: data.order, shop: data.shop };
};

export const headers = (headersArgs) => boundary.headers(headersArgs);

export default function PackingSlipGenerator() {
    const { order, shop } = useLoaderData();

    // State Management
    const [orderNum, setOrderNum] = useState(order.name);
    const [date, setDate] = useState(new Date().toLocaleDateString());
    const [tracking, setTracking] = useState(order.fulfillments[0]?.trackingInfo[0]?.number || "");
    const [senderName, setSenderName] = useState(shop.name);
    const [senderAddress, setSenderAddress] = useState(`${shop.billingAddress.address1}\n${shop.billingAddress.city}, ${shop.billingAddress.provinceCode} ${shop.billingAddress.zip}`);
    const [recipientName, setRecipientName] = useState(`${order.shippingAddress?.firstName} ${order.shippingAddress?.lastName}`);
    const [recipientAddress, setRecipientAddress] = useState(`${order.shippingAddress?.address1}\n${order.shippingAddress?.city}, ${order.shippingAddress?.provinceCode} ${order.shippingAddress?.zip}`);
    const [notes, setNotes] = useState("");

    return (
        <div style={{ padding: "20px", background: "#f1f2f4", minHeight: "100vh", fontFamily: "sans-serif" }}>
            {/* Print-Only CSS */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          /* 1. Set Page Size and Margins */
          @page {
            size: A4;
            margin: 0mm; /* We handle margins via padding on the container */
          }

          /* 2. Hide everything on the screen */
          body * {
            visibility: hidden;
          }

          /* 3. Show only the slip and fix positioning */
          #printable-slip, #printable-slip * {
            visibility: visible;
          }

          #printable-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 15mm !important; /* Proper breathing room for printers */
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
            box-sizing: border-box;
          }

          /* 4. Hide the Editor Sidebar entirely */
          .no-print {
            display: none !important;
          }
          
          /* 5. Ensure images (barcode) don't cut off */
          img, canvas {
            max-width: 100% !important;
          }
        }
      `}} />

            <div style={{ display: "flex", gap: "30px", maxWidth: "1200px", margin: "0 auto" }}>

                {/* EDITOR COLUMN */}
                <div className="no-print" style={{ flex: "1", display: "flex", flexDirection: "column", gap: "20px" }}>

                    <section style={cardStyle}>
                        <h4 style={cardTitleStyle}>Order & Tracking</h4>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Order Number</label>
                                <input style={inputStyle} value={orderNum} onChange={(e) => setOrderNum(e.target.value)} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Date</label>
                                <input style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
                            </div>
                        </div>
                        <label style={labelStyle}>Tracking Number</label>
                        <input style={inputStyle} value={tracking} onChange={(e) => setTracking(e.target.value)} />
                    </section>

                    <section style={cardStyle}>
                        <h4 style={cardTitleStyle}>Addresses</h4>
                        <label style={labelStyle}>Sender Name</label>
                        <input style={inputStyle} value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                        <label style={labelStyle}>Sender Address</label>
                        <textarea style={textareaStyle} value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} />

                        <label style={labelStyle}>Recipient Name</label>
                        <input style={inputStyle} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                        <label style={labelStyle}>Recipient Address</label>
                        <textarea style={textareaStyle} value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} />
                    </section>

                    <section style={cardStyle}>
                        <h4 style={cardTitleStyle}>Items</h4>
                        {order.lineItems.nodes.map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <input style={{ ...inputStyle, flex: 3, marginBottom: 0 }} value={item.title} readOnly />
                                <input style={{ ...inputStyle, flex: 1, marginBottom: 0 }} value={item.sku} readOnly />
                                <input style={{ ...inputStyle, width: '50px', marginBottom: 0 }} value={item.quantity} readOnly />
                            </div>
                        ))}
                    </section>

                    <div style={{ display: "flex", gap: "10px" }}>
                        <Link to={`/app`} style={{ ...btnWhiteStyle, flex: 1 }}>Back</Link>
                        <button onClick={() => window.print()} style={{ ...btnBlueStyle, flex: 1 }}>Print Slip</button>
                    </div>
                </div>

                {/* PREVIEW COLUMN */}
                <div style={{ flex: "1", position: "sticky", top: "20px" }}>
                    <div id="printable-slip" style={previewContainerStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <h2 style={{ margin: 0, fontSize: "24px" }}>PACKING SLIP</h2>
                            <div style={{ textAlign: "right", color: "#666" }}>{date}</div>
                        </div>
                        <p style={{ color: "#666", marginTop: "5px" }}>Order {orderNum}</p>

                        {/* BARCODE GENERATION */}
                        <div style={{ textAlign: "center", margin: "20px 0", border: "1px solid #eee", padding: "15px", borderRadius: "8px", background: "#fcfcfc" }}>
                            {tracking ? (
                                <Barcode
                                    value={tracking}
                                    width={1.5}
                                    height={60}
                                    fontSize={0}
                                    background="#fcfcfc"
                                />
                            ) : (
                                <p style={{ color: "#999" }}>No Tracking Number Available</p>
                            )}
                        </div>

                        <div style={{ display: "flex", gap: "20px", fontSize: "12px", marginBottom: "30px" }}>
                            <div style={{ flex: 1 }}>FROM<br /><strong>{senderName}</strong><br /><span style={{ whiteSpace: "pre-line" }}>{senderAddress}</span></div>
                            <div style={{ flex: 1 }}>SHIP TO<br /><strong>{recipientName}</strong><br /><span style={{ whiteSpace: "pre-line" }}>{recipientAddress}</span></div>
                        </div>

                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead style={{ borderBottom: "2px solid #000", textAlign: "left" }}>
                                <tr><th style={{ padding: "10px 0" }}>ITEM</th><th>SKU</th><th style={{ textAlign: "right" }}>QTY</th></tr>
                            </thead>
                            <tbody>
                                {order.lineItems.nodes.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "10px 0" }}>{item.title}</td>
                                        <td>{item.sku}</td>
                                        <td style={{ textAlign: "right" }}>{item.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Styling Constants
const cardStyle = { background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #dfe3e8" };
const cardTitleStyle = { margin: "0 0 15px 0", fontSize: "14px", fontWeight: "600" };
const labelStyle = { display: "block", fontSize: "12px", marginBottom: "5px", color: "#5c5f62" };
const inputStyle = { width: "100%", padding: "10px", marginBottom: "15px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing: "border-box" };
const textareaStyle = { ...inputStyle, minHeight: "60px", resize: "none" };
const btnWhiteStyle = { padding: "12px", border: "1px solid #ced4da", borderRadius: "6px", background: "#fff", cursor: "pointer", fontWeight: "600", textDecoration: "none", textAlign: "center" };
const btnBlueStyle = { padding: "12px", border: "none", borderRadius: "6px", background: "#2c6ecb", color: "#fff", cursor: "pointer", fontWeight: "600" };
const previewContainerStyle = { background: "#fff", padding: "40px", borderRadius: "8px", border: "1px solid #dfe3e8", minHeight: "600px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" };