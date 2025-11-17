/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chat from "../chat.js";
import type * as delivery_fees from "../delivery_fees.js";
import type * as denial_reasons from "../denial_reasons.js";
import type * as email from "../email.js";
import type * as files from "../files.js";
import type * as menu from "../menu.js";
import type * as migrations from "../migrations.js";
import type * as order_modifications from "../order_modifications.js";
import type * as orders from "../orders.js";
import type * as promotions from "../promotions.js";
import type * as restaurant from "../restaurant.js";
import type * as users from "../users.js";
import type * as vouchers from "../vouchers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  delivery_fees: typeof delivery_fees;
  denial_reasons: typeof denial_reasons;
  email: typeof email;
  files: typeof files;
  menu: typeof menu;
  migrations: typeof migrations;
  order_modifications: typeof order_modifications;
  orders: typeof orders;
  promotions: typeof promotions;
  restaurant: typeof restaurant;
  users: typeof users;
  vouchers: typeof vouchers;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
