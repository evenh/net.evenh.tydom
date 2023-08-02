import { isFinite } from 'lodash';
import { Device } from 'homey';
import { TydomDataElement } from '../../tydom/typings';
import TydomController from '../../tydom/controller';

class Light extends Device {
  api!: TydomController;

  async onInit() {
    this.api = await TydomController.getInstance();

    this.registerMultipleCapabilityListener(
      ['onoff', 'dim'],
      async ({ onoff, dim }) => {
        if (dim === undefined && onoff === false) {
          await this.setLevel(0.0);
        } else if (dim === undefined && onoff === true) {
          const oldDimValue: number = <number>this.getStoreValue('dim') || 1.0;
          await this.setLevel(oldDimValue);
        } else {
          // eslint-disable-next-line
          await this.setLevel(dim);
        }
      },
      500,
    );

    // Receive out-of-band level changes, e.g. performed with physical controls.
    this.api.subscribeTo(
      this.getData().id,
      async (update: TydomDataElement) => {
        await this.onTydomStateChange(update);
      },
    );

    this.log('Light has been initialized');
  }

  // Clean up OOB level changes.
  async onUninit() {
    this.api.removeSubscription(this.getData().id);
  }

  private async setLevel(level: number) {
    const { deviceId, endpointId } = this.getData();
    await this.api
      .updateLightLevel(deviceId, endpointId, level * 100)
      .then(async () => {
        await this.updateCapabilityValue(level * 100);
      });
  }

  private async onTydomStateChange(newRemoteState: TydomDataElement) {
    if (newRemoteState.validity === 'expired') return Promise.resolve();

    // Check if the new value is a number
    if (isFinite(newRemoteState.value))
      await this.updateCapabilityValue(<number>newRemoteState.value);

    return Promise.resolve();
  }

  private async updateCapabilityValue(newValue: number) {
    const isOn = newValue > 0;
    const dimValue = newValue / 100;

    await this.setCapabilityValue('onoff', isOn).catch((err) =>
      this.error(err),
    );
    await this.setCapabilityValue('dim', dimValue).catch((err) =>
      this.error(err),
    );
  }

  async onAdded() {
    this.log('Light has been added');
  }

  async onSettings({ oldSettings: {}, newSettings: {}, changedKeys: {}}): Promise<void> {
    this.log('Light settings where changed');
  }

  async onRenamed(name: string) {
    this.log(`Light was renamed to ${name}`);
  }

  async onDeleted() {
    this.log('Light has been deleted');
  }
}

module.exports = Light;
