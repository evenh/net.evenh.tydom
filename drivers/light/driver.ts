import Homey from "homey";
import TydomController from "../../tydom/controller";

class LightDriver extends Homey.Driver {
  private controller!: TydomController
  async onInit() {
    this.log("Light has been initialized");
    // @ts-ignore
    this.controller = this.homey.app.controller();
    return Promise.resolve();
  }


  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    this.log(this.controller.foo());
    return [];
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
