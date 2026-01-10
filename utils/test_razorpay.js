import Razorpay from "razorpay";

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

console.log("Testing Razorpay with keys:", { key_id, key_secret });

const razorpay = new Razorpay({
    key_id: key_id,
    key_secret: key_secret,
});

const testOrder = async () => {
    try {
        const options = {
            amount: 50000, // 500.00 INR
            currency: "INR",
            receipt: `receipt_test_${Date.now()}`,
        };

        console.log("Attempting to create order with options:", options);

        const order = await razorpay.orders.create(options);

        console.log("✅ Success! Order created:", order);
    } catch (error) {
        console.error("❌ Failed to create order:", error);
    }
};

testOrder();
