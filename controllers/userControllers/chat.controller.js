import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

export const chatWithBot = async (req, res) => {
    try {
        const { message } = req.body;
        
        const response = await client.responses.create({
            model: "openai/gpt-oss-20b",
            input: message,
            instructions: "You are a helpful assistant for an e-commerce website named SmartFloor that sells flooring solutions. Provide concise and relevant answers to user queries about products, orders, and services offered by SmartFloor.",
            max_output_tokens: 150,
            temperature: 0.7,
        });

        res.json({ success: true, reply: response.output_text });

    } catch (error) {
        console.error("Error in chatWithBot:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
