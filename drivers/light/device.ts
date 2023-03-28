import Homey from "homey";

class Light extends Homey.Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.registerMultipleCapabilityListener(["onoff", "dim"], async({ onoff, dim }) => {
      if (dim > 0 && onoff === false) {
        this.log("Wants to turn off");
        // await DeviceApi.setOnOffAsync(false); // turn off
      } else if (dim <= 0 && onoff === true) {
        this.log("Wants to turn on");
        // await DeviceApi.setOnOffAsync(true); // turn on
      } else {
        // eslint-disable-next-line
        this.log(`dim=${dim}, onoff=${onoff}`);
        // await DeviceApi.setOnOffAndDimAsync({ onoff, dim }); // turn on or off and set dim level in one command
      }
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
    // @ts-ignore
    this.homey.app.subscribeTo(this.getData().id, async(anything: any) => {
      await this.onTydomStateChange(anything);
    });

    this.log("Light has been initialized");
    return Promise.resolve();
  }

  async onTydomStateChange(foo: any) {
    this.log(`Got update for light: ${foo}`);
    return Promise.resolve();
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log("Light has been added");
    return Promise.resolve();
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  // eslint-disable-next-line no-empty-pattern
  async onSettings({oldSettings: {}, newSettings: {}, changedKeys: {}}): Promise<string | void> {
    this.log("Light settings where changed");
    return Promise.resolve();
  }

  async onRenamed(name: string) {
    this.log(`Light was renamed to ${name}`);
    return Promise.resolve();
  }

  async onDeleted() {
    this.log("Light has been deleted");
    return Promise.resolve();
  }
}

module.exports = Light;
