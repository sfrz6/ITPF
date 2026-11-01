import { customType } from "drizzle-orm/pg-core";

/** Raw binary data, stored and read back as a Node `Buffer`. */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});
