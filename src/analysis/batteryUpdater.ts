/*
 * KickStarter Analysis
 * Battery Updater
 *
 * This analysis is responsible to
 * update sensor's last checkin parameter.
 *
 * Battery Updater will run when:
 * - When the scheduled action (Battery Updater Trigger) triggers this script. (Default 1 day)
 *
 * How to setup this analysis
 * Make sure you have the following enviroment variables:
 * - account_token: the value must be a token from your profile. See how to generate account-token at: https://help.tago.io/portal/en/kb/articles/495-account-token.
 */

import { Utils, Account, Analysis } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { TagoContext } from "@tago-io/sdk/out/modules/Analysis/analysis.types";
import { fetchDeviceList } from "../lib/fetchDeviceList";

async function resolveDevice(context: TagoContext, account: Account, org_id: string, device_id: string) {
  if(!account || !org_id || !device_id) {
    throw "Missing Router parameter";
  }
  const device = await Utils.getDevice(account, device_id);

  const device_params = await account.devices.paramList(device_id);
  const dev_battery_param = device_params.find((param) => param.key === "dev_battery") || { key: "dev_battery", value: "N/A", sent: false };

  const [dev_battery] = await device.getData({ variables: ["bat", "battery_capacity"], qty: 1 });

  if (dev_battery?.value) {
    await account.devices.paramSet(device_id, { ...dev_battery_param, value: String(dev_battery.value) });
  }
}

async function handler(context: TagoContext, scope: Data[]): Promise<void> {
  console.debug("Running Analysis");

  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  } else if (!environment.account_token) {
    throw "Missing account_token environment var";
  }

  const account = new Account({ token: environment.account_token });

  const sensorList = await fetchDeviceList(account, [{ key: "device_type", value: "device" }]);

  sensorList.map((device) =>
    resolveDevice(context, account, device.tags.find((tag) => tag.key === "organization_id")?.value as string, device.tags.find((tag) => tag.key === "device_id")?.value as string)
  );
}

async function startAnalysis(context: TagoContext, scope: any) {
  try {
    await handler(context, scope);
    console.debug("Analysis finished");
  } catch (error) {
    console.debug(error);
    console.debug(error.message || JSON.stringify(error));
  }
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
