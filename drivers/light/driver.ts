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
  }
}

module.exports = LightDriver;
