'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

// create LINE SDK config from env variables
const config = {
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  // https://learn.microsoft.com/en-us/javascript/api/overview/azure/openai-readme?view=azure-node-preview
  // Replace with your Azure OpenAI key
  const key = process.env.AZURE_OPENAI_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const openaiClient = new OpenAIClient(endpoint, new AzureKeyCredential(key));

  const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_NAME; // model = "deployment name".

  const messages = [
    { role: "user", content: event.message.text },
  ];

  console.log(`Messages: ${messages.map((m) => m.content).join("\n")}`);

  let msg = '';
  const events = await openaiClient.streamChatCompletions(deploymentId, messages, { maxTokens: 1000 });
  for await (const event of events) {
    for (const choice of event.choices) {
      const delta = choice.delta?.content;
      if (delta !== undefined) {
        msg　 += `${delta}`;
        // console.log(`Chatbot: ${delta}`);
      }
    }
  }

  // create an echoing text message
  console.log(msg);
  const echo = { type: 'text', text: msg };

  // use reply API
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [echo],
  });
}

// listen on port
const port = process.env.PORT || 7071;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});