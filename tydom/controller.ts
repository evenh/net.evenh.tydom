import EventEmitter from 'events';
import { debounce, get } from 'lodash';
import { TydomHttpMessage, TydomResponse } from 'tydom-client/lib/utils/tydom';
import TydomClient, { createClient } from 'tydom-client';
import { Logger, stringIncludes } from './util';
import {
  Categories,
  ControllerUpdatePayload,
  TydomAccessoryContext,
  TydomAccessoryUpdateContext,
  TydomConfigResponse,
  TydomDataElement,
  TydomDeviceDataUpdateBody,
  TydomGroupsResponse,
  TydomMetaResponse,
  TydomPlatformConfig,
} from './typings';
import {
  asyncWait,
  getEndpointDetailsFromMeta,
  getEndpointGroupIdFromGroups,
  resolveEndpointCategory,
} from './helpers';

const DEFAULT_REFRESH_INTERVAL_SEC = 4 * 60 * 60; // 4 hours

// TODO: Background sync, scan, refresh
export default class TydomController extends EventEmitter {
  private static instance: TydomController;

  private log: Logger;
  private apiClient!: TydomClient;
  public config!: TydomPlatformConfig;
  private refreshInterval?: NodeJS.Timeout;

  private devicesInCategories: Map<string, Categories> = new Map();
  private devices: Map<string, TydomAccessoryContext> = new Map();
  private state: Map<string, unknown> = new Map();

  private subscribers: Map<string, (update: TydomDataElement) => void> =
    new Map();
  private constructor(log: Logger, config: TydomPlatformConfig) {
    super();
    this.log = log;
    this.config = config;

    // TODO: Check if hostname resolves to a local IP and enable self-signed TLS in that case
    const { hostname, username, password } = config;
    this.apiClient = createClient({
      hostname,
      username,
      password,
      followUpDebounce: 500,
    });

    this.apiClient.on('connect', () => {
      this.log.info(
        `Successfully connected to Tydom hostname=${hostname} with username=${username}`,
      );
      this.emit('connect');
    });
    this.apiClient.on('disconnect', () => {
      this.log.info(`Disconnected from Tydom hostname=${hostname}`);
      this.emit('disconnect');
    });
    this.apiClient.on('message', (message: TydomHttpMessage) => {
      try {
        this.handleMessage(message);
      } catch (err) {
        this.log.error(
          `Encountered an uncaught error while processing message=${JSON.stringify(
            message,
          )}`,
        );
        this.log.debug(`${err instanceof Error ? err.stack : err}`);
      }
    });
    this.on('update', async (update: ControllerUpdatePayload) => {
      await this.handleUpdate(update);
    });
  }

  public static createInstance(
    log: Logger,
    config: TydomPlatformConfig,
  ): TydomController {
    if (!TydomController.instance)
      TydomController.instance = new TydomController(log, config);

    return TydomController.instance;
  }

  public static getInstance() {
    if (!TydomController.instance)
      return Promise.reject(new Error('no tydomController instance created'));

    return TydomController.instance;
  }

  private static getUniqueId(deviceId: number, endpointId: number): string {
    return deviceId === endpointId
      ? `${deviceId}`
      : `${deviceId}:${endpointId}`;
  }

  private getAccessoryId(deviceId: number, endpointId: number): string {
    return `tydom:${this.config.username.slice(
      6,
    )}:accessories:${TydomController.getUniqueId(deviceId, endpointId)}`;
  }

  // Perform the connection and validation logic
  async connect() {
    try {
      await this.apiClient.connect();
      await asyncWait(250);
      await this.apiClient.get('/ping');
    } catch (err) {
      this.log.error(
        `Failed to connect to Tydom hostname=${this.config.hostname} with username="${this.config.username}"`,
      );
      throw err;
    }
  }

  public disconnect() {
    this.log.debug('Terminating connection to gateway');
    this.apiClient.close();
  }

  // Every message from Tydom gets checked here
  private handleMessage(message: TydomHttpMessage): void {
    const { uri, method, body } = message;
    const isDeviceUpdate = uri === '/devices/data' && method === 'PUT';
    if (isDeviceUpdate) {
      this.handleDeviceDataUpdate(body, 'data');
      return;
    }
    const isDeviceCommandUpdate = uri === '/devices/cdata' && method === 'PUT';
    if (isDeviceCommandUpdate) {
      this.handleDeviceDataUpdate(body, 'cdata');
      return;
    }
    this.log.debug('Unknown message from Tydom client', message);
  }

  private handleDeviceDataUpdate(
    body: TydomResponse,
    type: 'data' | 'cdata',
  ): void {
    if (!Array.isArray(body)) {
      this.log.debug('Unsupported non-array device update', body);
      return;
    }

    (body as TydomDeviceDataUpdateBody).forEach((device) => {
      const { id: deviceId, endpoints } = device;
      for (const endpoint of endpoints) {
        const { id: endpointId, data, cdata } = endpoint;
        const updates = type === 'data' ? data : cdata;
        const uniqueId = TydomController.getUniqueId(deviceId, endpointId);
        if (!this.devicesInCategories.has(uniqueId)) {
          this.log.debug(
            `←PUT:ignored for device id=${deviceId} and endpointId=${endpointId}`,
          );
          return;
        }
        const category =
          this.devicesInCategories.get(uniqueId) ?? Categories.OTHER;
        const accessoryId = this.getAccessoryId(deviceId, endpointId);
        this.log.debug(
          `←PUT:update for deviceId=${deviceId} and endpointId=${endpointId}, updates:\n`,
          JSON.stringify(updates),
        );
        const context: TydomAccessoryUpdateContext = {
          category,
          deviceId,
          endpointId,
          accessoryId,
        };
        this.emit('update', {
          type,
          updates,
          context,
        } as ControllerUpdatePayload);
      }
    });
  }

  public async sync(): Promise<{
    config: TydomConfigResponse;
    groups: TydomGroupsResponse;
    meta: TydomMetaResponse;
  }> {
    const { hostname, refreshInterval = DEFAULT_REFRESH_INTERVAL_SEC } =
      this.config;
    this.log.debug(`Syncing state from hostname=${hostname}...`);

    const config = await this.apiClient.get<TydomConfigResponse>(
      '/configs/file',
    );
    const groups = await this.apiClient.get<TydomGroupsResponse>(
      '/groups/file',
    );
    const meta = await this.apiClient.get<TydomMetaResponse>('/devices/meta');

    // Final outro handshake
    await this.refresh();
    if (this.refreshInterval) {
      this.log.debug('Removing existing refresh interval');
      clearInterval(this.refreshInterval);
    }
    this.log.debug(
      `Configuring refresh interval of ${Math.round(refreshInterval)}s`,
    );
    this.refreshInterval = setInterval(async () => {
      try {
        await this.refresh();
      } catch (err) {
        this.log.debug('Failed interval refresh with err', err);
      }
    }, refreshInterval * 1000);
    Object.assign(this.state, { config, groups, meta });
    return { config, groups, meta };
  }

  public async scan(): Promise<void> {
    this.log.info(`Scanning devices from hostname=${this.config.hostname}...`);
    const {
      settings = {},
      includedDevices = [],
      excludedDevices = [],
      includedCategories = [],
      excludedCategories = [],
    } = this.config;
    const { config, groups, meta } = await this.sync();
    const { endpoints, groups: configGroups } = config;
    endpoints.forEach((endpoint) => {
      const {
        id_endpoint: endpointId,
        id_device: deviceId,
        name: deviceName,
        first_usage: firstUsage,
      } = endpoint;
      const uniqueId = TydomController.getUniqueId(deviceId, endpointId);
      const { metadata } = getEndpointDetailsFromMeta(endpoint, meta);
      const groupId = getEndpointGroupIdFromGroups(endpoint, groups);
      const group = groupId
        ? configGroups.find(({ id }) => id === groupId)
        : undefined;
      const deviceSettings = settings[deviceId] || {};
      const categoryFromSettings = deviceSettings.category;
      // @TODO resolve endpoint productType
      this.log.debug(
        `Found new device with firstUsage=${firstUsage}, deviceId=${deviceId} and endpointId=${endpointId}`,
      );
      if (includedDevices.length && !stringIncludes(includedDevices, deviceId))
        return;

      if (excludedDevices.length && stringIncludes(excludedDevices, deviceId))
        return;

      const category =
        categoryFromSettings ||
        resolveEndpointCategory({
          firstUsage,
          metadata,
          settings: deviceSettings,
        });
      if (!category) {
        this.log.warn(
          `Unsupported firstUsage="${firstUsage}" for endpoint with deviceId="${deviceId}"`,
        );
        this.log.debug({ endpoint });
        return;
      }
      if (
        includedCategories.length &&
        !stringIncludes(includedCategories, category)
      )
        return;

      if (
        excludedCategories.length &&
        stringIncludes(excludedCategories, category)
      )
        return;

      if (!this.devicesInCategories.has(uniqueId)) {
        this.log.debug(
          `Adding new device with firstUsage=${firstUsage}, deviceId=${deviceId} and endpointId=${endpointId}`,
        );
        const accessoryId = this.getAccessoryId(deviceId, endpointId);
        const nameFromSetting = get(settings, `${deviceId}.name`) as
          | string
          | undefined;
        const name = nameFromSetting || deviceName;
        this.devicesInCategories.set(uniqueId, category);
        const context: TydomAccessoryContext = {
          name,
          category,
          metadata,
          settings: deviceSettings,
          group,
          deviceId,
          endpointId,
          accessoryId,
          manufacturer: 'Delta Dore',
          serialNumber: `ID${deviceId}`,
          // model: 'N/A',
          state: {},
        };
        this.devices.set(uniqueId, context);
        this.emit('device', context);
      }
    });
  }

  async refresh(): Promise<unknown> {
    this.log.debug('Refreshing Tydom controller ...');
    return this.apiClient.post('/refresh/all');
  }

  public getDevicesForCategory(
    category: Categories,
  ): (TydomAccessoryContext | undefined)[] {
    const items = [];
    for (const entry of this.devicesInCategories.entries())
      if (entry[1] === category) items.push(entry[0]);

    return items.map((id) => this.devices.get(id));
  }

  public async updateLightLevel(
    deviceId: string,
    endpointId: string,
    level: number,
  ) {
    await this.doPut(deviceId, endpointId, 'level')(level);
  }

  public async updateThermostatTemperature(
    deviceId: string,
    endpointId: string,
    temperature: number,
  ) {
    await this.doPut(deviceId, endpointId, 'setpoint')(temperature);
  }

  public async updateThermostatState(
    deviceId: string,
    endpointId: string,
    enabled: boolean,
  ) {
    await this.doPut(
      deviceId,
      endpointId,
      'hvacMode',
    )(enabled ? 'NORMAL' : 'STOP');
  }

  public subscribeTo(id: string, fn: (update: TydomDataElement) => void) {
    this.log.debug(`Adding subscriber for ID=${id}`);
    this.subscribers.set(id, fn);
  }

  public removeSubscription(id: string) {
    this.log.debug(`Removing subscriber for ID=${id}`);
    this.subscribers.delete(id);
  }

  public getDevices(category: Categories) {
    return this.getDevicesForCategory(category).map((v) => ({
      name: v?.name,
      data: {
        id: v?.accessoryId,
        deviceId: v?.deviceId,
        endpointId: v?.endpointId,
      },
    }));
  }

  private async handleUpdate(update: ControllerUpdatePayload) {
    try {
      const fn = this.subscribers.get(update.context.accessoryId);
      if (fn) update.updates.map((u) => <TydomDataElement>u).forEach(fn);

      return await Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  private doPut(deviceId: string, endpointId: string, updateType: string) {
    return debounce(
      async (value: unknown) => {
        await this.apiClient.put(
          `/devices/${deviceId}/endpoints/${endpointId}/data`,
          [
            {
              name: updateType,
              value,
            },
          ],
        );
      },
      15,
      { leading: true, trailing: true },
    );
  }
}
