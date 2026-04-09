const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.HUGGINGFACE_API_KEY;

async function test() {
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY is not set');
  }

  try {
    const response = await axios.post(
      "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-2-1",
      {
        inputs: "A futuristic city",
        parameters: { width: 1024, height: 1024 }
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        responseType: 'arraybuffer'
      }
    );
    console.log("Success! Got bytes:", response.data.length);
  } catch (error) {
    console.log("API Error thrown by Axios:", error.message);
    if (error.response) {
      console.log("Response Status:", error.response.status);
      console.log("Response Data String:", Buffer.from(error.response.data).toString('utf-8'));
    }
  }
}
test();
