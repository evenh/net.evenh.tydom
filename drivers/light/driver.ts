import Homey from "homey";
import { Categories } from "../../tydom/typings";

class LightDriver extends Homey.Driver {
  async onInit() {
    this.log("Light has been initialized");
    return Promise.resolve();
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    // @ts-ignore
    return this.homey.app.getDevices(Categories.LIGHTBULB);
    // Example device data, note that `store` is optional
    // {
    //   name: 'My Device',
    //   data: {
    //     id: 'my-device',
    //   },
    //   store: {
    //     address: '127.0.0.1',
    //   },
    // },
  }

}

module.exports = LightDriver;
