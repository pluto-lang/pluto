const packages = JSON.parse(process.env.RELEASE_PACKAGES);
const commitUrl = process.env.COMMIT_URL;

let mainMsg = `The new versions of the following package(s) have been published:`;
packages.forEach((pkg) => {
  const encodedName = encodeURIComponent(`${pkg.name}@${pkg.version}`);
  const releaseUrl = `https://github.com/pluto-lang/pluto/releases/tag/${encodedName}`;
  mainMsg += `\n* <${releaseUrl}|\`${pkg.name}\` version \`${pkg.version}\`>`;
});

const blocks = [
  {
    type: "header",
    text: {
      type: "plain_text",
      text: "📦 New Package Version Published",
      emoji: true,
    },
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: mainMsg,
    },
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `👀 For more details you can view the <${commitUrl}|commit>. You can also subscribe to the repository for future updates.`,
    },
  },
];

const message = JSON.stringify({ blocks: blocks });
console.log(message);
