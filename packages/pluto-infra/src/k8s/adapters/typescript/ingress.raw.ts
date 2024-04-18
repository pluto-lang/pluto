import { RuntimeHandler } from "../../types";

declare const __handler_: (...args: any[]) => Promise<any>;

export const handler: RuntimeHandler = async (req, res) => {
  await __handler_(req, res);
};
