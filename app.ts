import {Categories, ControllerUpdatePayload, TydomAccessoryContext} from "./tydom/typings";
import {open} from "inspector";
import assert from "assert";
import Homey from "homey";
import TydomController from "./tydom/controller";

open(9229, "0.0.0.0");

// TODO: Fix this hack
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
process.env.DEBUG = "tydom-client";

module.exports = class TydomApp extends Homey.App {
  private controller!: TydomController
  private subscribers: Map<string, (...args: any[]) => void> = new Map();

  async onInit() {
    this.log("Delta Dore Tydom 1.0 has been initialized");

    const username = "mac"; // TODO: Read from mDNS
    const password = "pw";
    // TODO: Replace these with your actual Tydom credentials
    const hostname = "10.14.20.139";
    // eslint-disable-next-line
    this.controller = new TydomController(this.log, {
      settings: {},
      debug: true,
      username: username,
      password: password,
      hostname: hostname
    });

    return this.didFinishLaunching();
  }

  private async didFinishLaunching() {
    assert(this.controller);
    await this.controller.connect();
    await this.controller.scan();
    this.controller.on("update", async(update: ControllerUpdatePayload) => {
      await this.handleUpdates(update);
    });
  }

  public getDevices(category: Categories) {
    return this.controller.getDevicesForCategory(category).map(v => {
      return {
        name: v?.name,
        data: {id: v?.accessoryId}
      };
    });
  }

  public subscribeTo(id: string, fn: (...args: any[]) => void) {
    this.log(`Adding subscriber for ID=${id}`);
    this.subscribers.set(id, fn);
  }

  public removeSubscription(id: string) {
    this.log(`Removing subscriber for ID=${id}`);
    this.subscribers.delete(id);
  }

  async onUninit() {
    this.log("Stopping app");
    this.controller.disconnect();
    return Promise.resolve();
  }

  private async handleUpdates(update: ControllerUpdatePayload) {
    try {
      const fn = this.subscribers.get(update.context.accessoryId);
      if (fn) {
        update.updates.forEach(fn);
      }
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }
};
