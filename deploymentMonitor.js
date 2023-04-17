require("dotenv").config();
const functions = require("@google-cloud/functions-framework");
const Axios = require("axios");

const BASE_URL = process.env.NETFLIFY_BASE_URL;
const TOKEN = process.env.NETLIFY_TOKEN;
const PROD_SITE_ID = process.env.NETFLIFY_PROD_SITE_ID;
const BUILD_HOOK_ENDPOINT = process.env.BUILD_HOOK_ENDPOINT;

functions.http("deploymentMonitor", async (req, res) => {
  if (!BASE_URL || !TOKEN || !PROD_SITE_ID || !BUILD_HOOK_ENDPOINT) {
    return res.status(500).send("Function environment variables are misising!");
  }

  try {
    const { data } = await Axios(`${BASE_URL}/sites/${PROD_SITE_ID}/deploys`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      method: "GET",
    });

    if (data) {
      const deployment = data[0];

      if (deployment.state === "ready" || "building" || "new" || "enqueued") {
        const deploymentMessageStatus =
          deployment.state === "ready" ? "successful" : deployment.state;

        return res
          .status(200)
          .send(
            `Recent Deployment ${deployment?.id} ${deploymentMessageStatus}`
          );
      }

      const retyData = await Axios(
        `${BUILD_HOOK_ENDPOINT}?clear_cache=true&trigger_title=Retrigger failed deploy #${
          deployment?.id
        } at ${new Date()}`,
        {
          method: "POST",
          data: "{}",
        }
      );

      return res
        .status(retyData?.status)
        .send(`Retrigger failed deploy #${deployment?.id} at ${new Date()}`);
    }
  } catch (error) {
    return res.status(500).send(error);
  }
});
