require("dotenv").config();
const functions = require("@google-cloud/functions-framework");
const Axios = require("axios");

const BASE_URL = process.env.NETFLIFY_BASE_URL;
const TOKEN = process.env.NETLIFY_TOKEN;
const PROD_SITE_ID = process.env.NETFLIFY_PROD_SITE_ID;
const BUILD_HOOK_ENDPOINT = process.env.BUILD_HOOK_ENDPOINT;

/**
 * HTTP function that declares a variable.
 *
 * @param {Object} req request context.
 * @param {Object} res response context.
 */
exports.deploymentMonitor = async (req, res) => {
  if (!BASE_URL || !TOKEN || !PROD_SITE_ID || !BUILD_HOOK_ENDPOINT) {
    return res.status(500).send("Function environment variables are misising!");
  }

  try {
    const { data } = await Axios(`${BASE_URL}/sites/${PROD_SITE_ID}/deploys`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      method: "GET",
    });

    if (data[0]) {
      const { state, id } = data[0];

      if (
        state === "ready" ||
        state === "building" ||
        state === "new" ||
        state === "enqueued"
      ) {
        const deploymentMessageStatus =
          state === "ready" ? "successful" : state;

        return res
          .status(200)
          .send(`Recent Deployment ${id} ${deploymentMessageStatus}`);
      }

      const retyData = await Axios(
        `${BUILD_HOOK_ENDPOINT}?clear_cache=true&trigger_title=Retrigger failed deploy #${id} at ${new Date()}`,
        {
          method: "POST",
          data: "{}",
        }
      );

      return res
        .status(retyData?.status)
        .send(`Retrigger failed deploy #${id} at ${new Date()}`);
    }
  } catch (error) {
    return res.status(500).send(error);
  }
};
