import { Utils } from "@tago-io/sdk";
import { RouterConstructorData } from "../../types";

/**
 * Main function of deleting reports
 * @param config_dev Device of the configuration
 * @param context Context is a variable sent by the analysis
 * @param scope Scope is a variable sent by the analysis
 * @param account Account instanced class
 * @param environment Environment Variable is a resource to send variables values to the context of your script
 */
export default async ({ config_dev, context, scope, account, environment }: RouterConstructorData) => {
  if (!account || !environment || !scope || !config_dev || !context) {
    throw new Error("Missing parameters");
  }
  const action_group = scope[0].group;
  if(!action_group) {
    throw new Error("Missing action group");
  }

  const [action_registered] = await account.actions.list({
    page: 1,
    fields: ["id", "name", "tags"],
    filter: {
      tags: [{ key: "action_group", value: action_group }],
    },
    amount: 1,
  });

  if(!action_registered.tags) {
    throw new Error("Action not found in Tago");
  }

  const org_id = action_registered.tags.find((x) => x.key === "organization_id")?.value;

  if(!org_id) {
    throw new Error("Organization not found in Tago");
  }

  const org_dev = await Utils.getDevice(account, org_id);
  await org_dev.deleteData({ groups: action_group, qty: 9999 });

  if (!action_registered) {
    return console.debug("ERROR - No action found.");
  }

  await account.actions.delete(action_registered.id);

  return console.debug("Action deleted successfully!");
};
