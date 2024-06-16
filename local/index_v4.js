'use strict';

const { exec } = require('child_process');

let setting = '';
let title = '';
let question = '';
let number = '';
// Python スクリプトを実行

const line = require('@line/bot-sdk');
const express = require('express');
const crypto = require("crypto");
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL;
const BASE_PUBLIC_DIR = 'public';

const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

const { execFile } = require('child_process');
const util = require('util');

// promisifyを使ってexecFileをPromise形式に変換
const execFileAsync = util.promisify(execFile);

// create LINE SDK config from env variables
const config = {
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});
const blobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
});

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// serve static and downloaded files
app.use(`/${BASE_PUBLIC_DIR}`, express.static(BASE_PUBLIC_DIR));

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  console.log('start');
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
    const key = process.env.AZURE_OPENAI_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const openaiClient = new OpenAIClient(endpoint, new AzureKeyCredential(key));
      
    const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_NAME; // model = "deployment name".
    const userId = event.source.userId;
  
    if (event.type !== 'message' && event.type !== 'postback') {
      // ignore non-text-message event
      return Promise.resolve(null);
    }else if (event.type === 'postback') {
          //https://developers.line.biz/ja/reference/messaging-api/#sticker-message
          //https://developers.line.biz/ja/docs/messaging-api/sticker-list/#sticker-definitions
          return client.replyMessage({
            replyToken: event.replyToken,
            messages: [{
              type: 'sticker',
              packageId: "11537",
              stickerId: "52002735"
            }]
          });
      
      } else if (event.message.type === 'text') {
        if (event.message.text === 'Yes') {
        }else{
        //https://developers.line.biz/ja/reference/messaging-api/#quick-reply

        const messages = [
          { role: "user", content:event.message.text },
        ];
      
        console.log(`Messages: ${messages.map((m) => m.content).join("\n")}`);
      
        let msg = '';
        const events = await openaiClient.streamChatCompletions(deploymentId, messages, { maxTokens: 4000 });
        for await (const event of events) {
          for (const choice of event.choices) {
            const delta = choice.delta?.content;
            if (delta !== undefined) {
              msg　 += `${delta}`;
              // console.log(`Chatbot: ${delta}`);
            }
          }
        }

        const messages2 = [
          { role: "user", content: "次の質問を100文字以内で要約してください。疑問文で、使用言語とエラーを人がインターネットで検索できるようにしてください。"+msg },
        ];
        let msg2 = '';
        const events2 = await openaiClient.streamChatCompletions(deploymentId, messages2, { maxTokens: 4000 });
        for await (const event of events2) {
          for (const choice of event.choices) {
            const delta = choice.delta?.content;
            if (delta !== undefined) {
              msg2　 += `${delta}`;
              // console.log(`Chatbot: ${delta}`);
            }
          }
        }
        
        const output = await runPythonScript(msg2);
        const prompt = `以下の質問を次のフォーマットで出力して
        ①
        ##########
        ②
        ③
        ##########
        ④
        以下は出力しないで従って
        ①は質問のタイトル
        ②はコードの概要
        ③質問に必要なコードの抜粋
        ④質問文全体をわかりやすく簡潔な質問文にして
        `;
        const messages3 = [
            { role: "user", content: prompt+msg },
          ];
        let msg3 = '';

        
        const events3 = await openaiClient.streamChatCompletions(deploymentId, messages3, { maxTokens: 4000 });
        for await (const event of events3) {
          for (const choice of event.choices) {
            const delta = choice.delta?.content;
            if (delta !== undefined) {
              msg3　 += `${delta}`;
              // console.log(`Chatbot: ${delta}`);
            }
          }
        }
        const ary = [];
        // textから#でトリムしてindexにいれるスクリプト
        const sections = msg3.split('##########').map(section => section.trim());
            sections.forEach((section, index) => {
                ary.push(section);
            });
        setting = '2';
        title = ary[0];
        question = ary[2];
        number = '0';
        await runPythonScript2(setting,title,question,number);
         
        return client.replyMessage({
          replyToken: event.replyToken,
          messages: [{
            type: 'text',
            text: msg,
          },
          {
            type: 'text',
            text: "関連URL"+"\n"+output,
          },{
            type: 'text',
            text: '問題は解決しましたか？',
            "quickReply": {
              "items": [
                {
                  "type": "action",
                  "action": {
                    "type": "message",
                    "label": "Yes",
                    "text": "Yes",
                  }
                },
                {
                  "type": "action",
                  "action": {
                    "type": "postback",
                    "label": "No",
                    "data":"A",
                    "displayText":"No"
                  }
                }
              ]
            }
          }]
      });
      }

    }
}

const getStreamData = async (stream)  => {
    return new Promise(resolve => {
      let result = [];
      stream.on("data", (chunk) => {
        result.push(Buffer.from(chunk));
      });
      stream.on("end", () => {
        resolve(result);
      });
    });
}

async function runPythonScript(msg2) {
  try {
    const { stdout, stderr } = await execFileAsync('python3', ['./search.py',String(msg2)]);
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    if (stdout) {
      return stdout;
    };
  } catch (error) {
    console.error(`execFile error: ${error}`);
    return error;
  }
}

async function runPythonScript2(setting,title,question,number) {
  try {
    const { stdout, stderr } = await execFileAsync('python3', ['./search.py',String(setting),String(title),String(question),String(number)]);
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    if (stdout) {
      return stdout;
    };
  } catch (error) {
    console.error(`execFile error: ${error}`);
    return error;
  }
}

// listen on port
const port = process.env.PORT || 7071;
app.listen(port, () => {
  console.log(`listening on ${port}`);
  console.log(config);
});


  