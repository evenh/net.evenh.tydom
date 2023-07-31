import Homey from 'homey';
import { Categories } from '../../tydom/typings';
import TydomController from '../../tydom/controller';

class LightDriver extends Homey.Driver {
  private api!: TydomController;
  async onInit() {
    this.api = await TydomController.getInstance();
    this.log('LightDriver has been initialized');
    return Promise.resolve();
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return this.api.getDevices(Categories.LIGHTBULB);
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
