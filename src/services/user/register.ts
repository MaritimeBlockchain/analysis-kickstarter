import { Device, Types, Utils } from "@tago-io/sdk";
import validation from "../../lib/validation";
import registerUser from "../../lib/registerUser";
import { parseTagoObject } from "../../lib/data.logic";
import { RouterConstructorData } from "../../types";

interface UserData {
  name: string;
  email: string;
  phone?: string | number | boolean | void;
  timezone: string;
  tags?: Types.Common.TagsObj[];
  password?: string;
  id?: string;
}

/**
 * Function that handle phone number
 * @param phone_number Phone number
 */
function phoneNumberHandler(phone_number: string) {
  //US as default
  let country_code = "+1";
  let resulted_phone_number: string;

  if (phone_number.slice(0, 1).includes("+")) {
    country_code = phone_number.slice(0, 3);
    phone_number = phone_number.slice(3);
  }
  //removing special characters
  resulted_phone_number = phone_number.replace(/[^\w\s]/gi, "");

  resulted_phone_number = `${country_code}${resulted_phone_number}`;

  return resulted_phone_number;
}

//registered by admin account.

/**
 * Function that register new user
 * @param config_dev Device that contains the configuration
 * @param context Context is a variable sent by the analysis
 * @param scope Scope is a variable sent by the analysis
 * @param account Account instanced class
 * @param environment Environment Variable is a resource to send variables values to the context of your script
 */
export default async ({ config_dev, context, scope, account, environment }: RouterConstructorData) => {
  if (!account || !environment || !scope || !config_dev || !context) {
    throw new Error("Missing parameters");
  }
  const org_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, org_id);

  //Collecting data
  const new_user_name = scope.find((x) => x.variable === "new_user_name" || x.variable === "new_orgadmin_name");
  const new_user_email = scope.find((x) => x.variable === "new_user_email" || x.variable === "new_orgadmin_email");
  const new_user_access = scope.find((x) => x.variable === "new_user_access" || x.variable === "new_orgadmin_access");
  const new_user_phone = scope.find((x) => x.variable === "new_user_phone" || x.variable === "new_orgadmin_phone");

  //validation
  const validate = validation("user_validation", org_dev);

  if (!new_user_name?.value) {
    throw validate("Name field is empty", "danger");
  }
  if ((new_user_name.value as string).length < 3) {
    throw validate("Name field is smaller than 3 character", "danger");
  }
  if (!new_user_email?.value) {
    throw validate("Email field is empty", "danger");
  }
  if (!new_user_access?.value) {
    throw validate("Access field is empty", "danger");
  }
  if (new_user_phone?.value) {
    new_user_phone.value = phoneNumberHandler(new_user_phone.value as string);
  }

  const [user_exists] = await account.run.listUsers({
    page: 1,
    amount: 1,
    filter: { email: new_user_email.value as string },
  });

  if (user_exists) {
    throw validate("#VAL.USER_ALREADY_EXISTS#", "danger");
  }

  //creating user
  const { timezone } = await account.info();

  const new_user_data: UserData = {
    name: new_user_name.value as string,
    email: (new_user_email.value as string).trim(),
    phone: (new_user_phone?.value as string) || "",
    timezone: timezone,
    tags: [
      {
        key: "organization_id",
        value: org_id,
      },
      {
        key: "access",
        value: new_user_access.value as string,
      },
    ],
  };

  const { url: run_url } = await account.run.info();

  //registering user
  const new_user_id = await registerUser(context, account, new_user_data, run_url).catch((msg) => {
    throw validate(msg, "danger");
  });

  let user_access_label: string | undefined= "";

  if (new_user_access.value === "admin") {
    user_access_label = "Administrator";
  } else if (new_user_access.value === "orgadmin") {
    user_access_label = "Organization Admin";
  } else if (new_user_access.value === "guest") {
    user_access_label = "Guest";
  } else {
    user_access_label = new_user_access?.metadata?.label;
  }

  let user_data = parseTagoObject(
    {
      user_id: { value: new_user_id as string, metadata: { label: `${new_user_name.value} (${new_user_email.value})` } },
      user_name: new_user_name.value as string,
      user_email: (new_user_email.value as string).trim(),
      user_phone: (new_user_phone?.value as string) || "",
      user_access: { value: new_user_access.value as string, metadata: { label: user_access_label } },
    },
    new_user_id
  );

  if (new_user_access.value === "admin") {
    user_data = user_data.concat([{ variable: "user_admin", value: new_user_id as string, group: new_user_id, metadata: { label: new_user_name.value as string } }]);
  }

  //sending to org device
  org_dev.sendData(user_data);

  //sending to admin device (settings_device)
  config_dev.sendData(user_data);

  return validate("#VAL.USER_SUCCESSFULLY_INVITED_AN_EMAIL_WILL_BE_SENT_WITH_THE_CREDENTIALS_TO_THE_NEW_USER#", "success");
};
