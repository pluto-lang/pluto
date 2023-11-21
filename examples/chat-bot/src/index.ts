import OpenAI from "openai";
import { Router, KVStore, HttpRequest, HttpResponse } from "@plutolang/pluto";

const kvstore = new KVStore("kvstore");
const router = new Router("router");

// Replace the placeholder with your OpenAI API Key and DO NOT publish it publicly.
const OPENAI_API_KEY = "sk-Acj6oPEXKUctapxWxxxxxxxxxxxxxxxx";
// Replace your desired model. You can find all available models here: https://platform.openai.com/docs/models
const MODEL = "gpt-3.5-turbo";

router.post("/chat", async (req: HttpRequest): Promise<HttpResponse> => {
  const bot = req.query["bot"] ?? "default";
  const newMsg = req.body;
  console.debug("Received a user message, Bot:", bot, ", Message:", newMsg);

  const record = await kvstore.get(bot).catch(() => undefined);
  const messages = record ? JSON.parse(record) : [];
  messages.push({ role: "user", content: newMsg });

  let respMsg;
  try {
    respMsg = await chatWithOpenAI(messages);
  } catch (e) {
    let body;
    if (e instanceof Error) {
      body = e.message;
    } else {
      body = "Unknown error happend when call OpenAI API.";
    }

    return {
      statusCode: 500,
      body: body,
    };
  }

  // To maintain the continuity of the conversation, store the response message in the database.
  messages.push(respMsg);
  await kvstore.set(bot, JSON.stringify(messages));
  return {
    statusCode: 200,
    body: respMsg.content!,
  };
});

router.post("/new", async (req: HttpRequest): Promise<HttpResponse> => {
  const bot = req.query["bot"];
  if (!bot) {
    return {
      statusCode: 400,
      body: "Missing bot parameter. Please provide a name and its initialization system message for your bot in order to define the assistant's behavior effectively.",
    };
  }
  const sysMsg = req.body;

  const messages = [{ role: "system", content: sysMsg }];
  await kvstore.set(bot, JSON.stringify(messages));
  return {
    statusCode: 200,
    body: "Now you can enjoy your chatbot.",
  };
});

async function chatWithOpenAI(messages: any[]) {
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const chatCompletion = await openai.chat.completions.create({
    messages: messages,
    model: MODEL,
  });

  // Check if the response is valid.
  const choices = chatCompletion.choices;
  if (choices.length == 0 || choices[0].message.content == null) {
    console.error("OpenAI Response: ", chatCompletion);
    throw new Error(
      "Something went wrong. OpenAI did not respond with a valid message. Please try again later."
    );
  }

  return choices[0].message;
}
