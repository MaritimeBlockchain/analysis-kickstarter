/*
 * KickStarter Analysis
 * Alert Handler
 *
 * Work same as the handler analysis, but only for alerts.
 * This analysis handles most of buttons clickable by dashboard input form widgets such as dynamic table and input form widgets.
 *
 * Handles the following actions:
 * - Add, edit and delete an Alert
 *
 * How to setup this analysis
 * Make sure you have the following enviroment variables:
 * - config_token: the value must be a token from a HTTPs device, that stores general information of the application.
 * - account_token: the value must be a token from your profile. See how to generate account-token at: https://help.tago.io/portal/en/kb/articles/495-account-token.
 */
import { Account, Device, Analysis, Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { TagoContext } from "@tago-io/sdk/out/modules/Analysis/analysis.types";
import { editAlert } from "../services/alerts/edit";
import { createAlert } from "../services/alerts/register";
import { deleteAlert } from "../services/alerts/remove";

/**
 * Function that starts the analysis
 * @param context Context is a variable sent by the analysis
 * @param scope Scope is a variable sent by the analysis
 */
async function startAnalysis(context: TagoContext, scope: Data[]): Promise<void> {
  if (!scope[0]) {
    return console.error("Not a valid TagoIO Data");
  }

  console.debug(JSON.stringify(scope));
  console.debug("Alert analysis started");

  // Get the environment variables.
  const environment = Utils.envToJson(context.environment);
  if (!environment.account_token) {
    return console.debug('Missing "account_token" environment variable');
  } else if (environment.account_token.length !== 36) {
    return console.debug('Invalid "account_token" in the environment variable');
  }

  // Instance the Account class
  const account = new Account({ token: environment.account_token });

  // Instance the device class using the device from scope variables.
  // device is always the device used in the widget to trigger the analysis.
  // const device_id = scope[0].device;
  // const device_token = await Utils.getTokenByName(account, device_id);

  // Instance of the settings device, that stores global information of the application.
  const config_dev = new Device({ token: environment.config_token });

  const router = new Utils.AnalysisRouter({
    account,
    environment,
    scope,
    config_dev,
    context,
  });

  router.register(createAlert).whenInputFormID("create-alert-dev");
  router.register(editAlert).whenWidgetExec("edit");
  router.register(deleteAlert).whenWidgetExec("delete");

  const result = await router.exec();

  console.debug("Script end. Functions that run:");
  console.debug(result.services);
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
