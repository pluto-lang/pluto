import { Schedule } from "@plutolang/pluto";
import { retryPolicies, WebClient, LogLevel } from "@slack/web-api";

const sched = new Schedule("joke-sched");

sched.cron("0 9 * * *", async () => {
  // Replace the placeholder with your token and DO NOT publish it publicly.
  const slackAppToken = "xoxb-xxxxxxxxxxxxxxxxx";
  // Replace the channel you want to post the message to
  const channelId = "C06xxxxxxxx";

  const fetchJoke = async (): Promise<string> => {
    const JOKE_URL =
      "https://v2.jokeapi.dev/joke/Programming?blacklistFlags=nsfw,religious,political,racist&type=single";
    const response = await fetch(JOKE_URL);
    const data: any = await response.json();
    if (response.status != 200 || data["error"] != false) {
      throw new Error("Failed to fetch the joke.");
    }
    return data["joke"];
  };

  try {
    const client = new WebClient(slackAppToken, {
      logLevel: LogLevel.DEBUG,
      retryConfig: retryPolicies.fiveRetriesInFiveMinutes,
    });
    const joke = await fetchJoke();

    const text = `Hey there, everyone!

Just wanted to drop in and say hello to all of you amazing people. Hope you're all doing great!
Now, I've got a little something to tickle your funny bones. Check out this joke:

${joke}

Take care and stay awesome,
Joke Bot powered by Pluto`;

    // Call the chat.postMessage method using the WebClient
    const result = await client.chat.postMessage({
      channel: channelId,
      text: text,
    });

    console.log(result);
  } catch (error) {
    console.error(error);
  }
});
