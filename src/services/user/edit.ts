import { Utils } from "@tago-io/sdk";
import { RouterConstructorData } from "../../types";

/**
 * Function that edit user information
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
  console.debug("Editting User.");
  // @ts-expect-error user is not defined on sdk types
  const user_id = scope[0].user;

  const user_name = scope.find((x) => x.variable === "user_name");
  const user_phone = scope.find((x) => x.variable === "user_phone");

  const user_exists = await account.run.userInfo(user_id);
  if (!user_exists) {
    throw "User does not exist";
  }

  const new_user_info: any = {};

  if (user_name) {
    //fetching prev data
    const [user_name_config_dev] = await config_dev.getData({ variables: "user_name", qty: 1, groups: user_id });

    await config_dev.editData({ ...user_name_config_dev, value: user_name.value as string });

    new_user_info.name = user_name.value;
    await account.run.userEdit(user_id, new_user_info);
  }
  if (user_phone) {
    //fetching prev data
    const [user_phone_config_dev] = await config_dev.getData({ variables: "user_phone", qty: 1, groups: user_id });

    await config_dev.editData({ ...user_phone_config_dev, value: user_phone.value as string });

    new_user_info.phone = user_phone.value;
    await account.run.userEdit(user_id, new_user_info);
  }
  return;
};
