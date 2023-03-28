/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/restrict-template-expressions,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument */
import {asyncWait, getEndpointDetailsFromMeta, getEndpointGroupIdFromGroups, resolveEndpointCategory} from "./helpers";
import {EventEmitter} from "events";
import {get} from "lodash";
import {stringIncludes} from "./util";
import {TydomHttpMessage, TydomResponse} from "tydom-client/lib/utils/tydom";
import {
  Categories,
  ControllerUpdatePayload,
  TydomAccessoryContext,
  TydomAccessoryUpdateContext,
  TydomConfigResponse,
  TydomDeviceDataUpdateBody,
  TydomGroupsResponse,
  TydomMetaResponse,
  TydomPlatformConfig,
  UnknownObject
} from "./typings";
import TydomClient, {createClient} from "tydom-client";

const DEFAULT_REFRESH_INTERVAL_SEC = 4 * 60 * 60; // 4 hours

// TODO: Background sync, scan, refresh
export default class TydomController extends EventEmitter {
  private readonly logger: (...args: any[]) => void;
  private apiClient!: TydomClient
  public config!: TydomPlatformConfig;
  private refreshInterval?: NodeJS.Timeout;

  private devicesInCategories: Map<string, Categories> = new Map();
  private devices: Map<string, TydomAccessoryContext> = new Map();
  private state: Map<string, unknown> = new Map();

  constructor(logger: (...args: any[]) => void, config: TydomPlatformConfig) {
    super();
    this.logger = logger;
    this.config = config;

    const { hostname, username, password } = config;
    this.apiClient = createClient({
      hostname: hostname,
      username: username,
      password: password,
      followUpDebounce: 500,
    });

    this.apiClient.on("connect", () => {
      this.logger(`Successfully connected to Tydom hostname=${hostname} with username=${username}`);
      this.emit("connect");
    });
    this.apiClient.on("disconnect", () => {
      this.logger(`Disconnected from Tydom hostname=${hostname}`);
      this.emit("disconnect");
    });
    this.apiClient.on("message", (message: TydomHttpMessage) => {
      try {
        this.handleMessage(message);
      }
      catch (err) {
        this.logger(`Encountered an uncaught error while processing message=${JSON.stringify(message)}`);
        this.debug(`${err instanceof Error ? err.stack : err}`);
      }
    });
  }

  private getUniqueId(deviceId: number, endpointId: number): string {
    return deviceId === endpointId ? `${deviceId}` : `${deviceId}:${endpointId}`;
  }

  private getAccessoryId(deviceId: number, endpointId: number): string {
    return `tydom:${this.config.username.slice(6)}:accessories:${this.getUniqueId(deviceId, endpointId)}`;
  }

  // Perform the connection and validation logic
  async connect() {
    try {
      await this.apiClient.connect();
      await asyncWait(250);
      await this.apiClient.get("/ping");
    } catch (err) {
      this.logger(`Failed to connect to Tydom hostname=${this.config.hostname} with username="${this.config.username}"`);
      throw err;
    }
  }

  public disconnect() {
    this.debug("Terminating connection to gateway");
    this.apiClient.close();
  }

  // Every message from Tydom gets checked here
  private handleMessage(message: TydomHttpMessage): void {
    const { uri, method, body } = message;
    const isDeviceUpdate = uri === "/devices/data" && method === "PUT";
    if (isDeviceUpdate) {
      this.handleDeviceDataUpdate(body, "data");
      return;
    }
    const isDeviceCommandUpdate = uri === "/devices/cdata" && method === "PUT";
    if (isDeviceCommandUpdate) {
      this.handleDeviceDataUpdate(body, "cdata");
      return;
    }
    this.debug(`Unknown message from Tydom client:\n${message.toString()}`);
  }

  private handleDeviceDataUpdate(body: TydomResponse, type: "data" | "cdata"): void {
    if (!Array.isArray(body)) {
      this.debug("Unsupported non-array device update", body);
      return;
    }

    (body as TydomDeviceDataUpdateBody).forEach(device => {
      const { id: deviceId, endpoints } = device;
      for (const endpoint of endpoints) {
        const { id: endpointId, data, cdata } = endpoint;
        const updates = type === "data" ? data : cdata;
        const uniqueId = this.getUniqueId(deviceId, endpointId);
        if (!this.devicesInCategories.has(uniqueId)) {
          this.debug(`←PUT:ignored for device id=${deviceId} and endpointId=${endpointId}`);
          return;
        }
        const category = this.devicesInCategories.get(uniqueId) ?? Categories.OTHER;
        const accessoryId = this.getAccessoryId(deviceId, endpointId);
        this.debug(`←PUT:update for deviceId=${deviceId} and endpointId=${endpointId}, updates:\n`, updates);
        const context: TydomAccessoryUpdateContext = {
          category,
          deviceId,
          endpointId,
          accessoryId
        };
        this.emit("update", {
          type,
          updates,
          context
        } as ControllerUpdatePayload);
      }
    });
  }

  async sync(): Promise<{config: TydomConfigResponse; groups: TydomGroupsResponse; meta: TydomMetaResponse}> {
    const { hostname, refreshInterval = DEFAULT_REFRESH_INTERVAL_SEC } = this.config;
    this.debug(`Syncing state from hostname=${hostname}...`);
    const config = await this.apiClient.get<TydomConfigResponse>("/configs/file");
    const groups = await this.apiClient.get<TydomGroupsResponse>("/groups/file");
    const meta = await this.apiClient.get<TydomMetaResponse>("/devices/meta");
    // Final outro handshake
    await this.refresh();
    if (this.refreshInterval) {
      this.debug("Removing existing refresh interval");
      clearInterval(this.refreshInterval);
    }
    this.debug(`Configuring refresh interval of ${Math.round(refreshInterval)}s`);
    this.refreshInterval = setInterval(async() => {
      try {
        await this.refresh();
      }
      catch (err) {
        this.debug("Failed interval refresh with err", err);
      }
    }, refreshInterval * 1000);
    Object.assign(this.state, { config, groups, meta });
    return { config, groups, meta };
  }
  async scan(): Promise<void> {
    this.logger(`Scanning devices from hostname=${this.config.hostname}...`);
    const {
      settings = {},
      includedDevices = [],
      excludedDevices = [],
      includedCategories = [],
      excludedCategories = []
    } = this.config;
    const { config, groups, meta } = await this.sync();
    const { endpoints, groups: configGroups } = config;
    endpoints.forEach(endpoint => {
      const {
        id_endpoint: endpointId, id_device: deviceId, name: deviceName, first_usage: firstUsage
      } = endpoint;
      const uniqueId = this.getUniqueId(deviceId, endpointId);
      const { metadata } = getEndpointDetailsFromMeta(endpoint, meta);
      const groupId = getEndpointGroupIdFromGroups(endpoint, groups);
      const group = groupId ? configGroups.find(({ id }) => id === groupId) : undefined;
      const deviceSettings = settings[deviceId] || {};
      const categoryFromSettings = deviceSettings.category;
      // @TODO resolve endpoint productType
      this.logger(`Found new device with firstUsage=${firstUsage}, deviceId=${deviceId} and endpointId=${endpointId}`);
      if (includedDevices.length && !stringIncludes(includedDevices, deviceId)) {
        return;
      }
      if (excludedDevices.length && stringIncludes(excludedDevices, deviceId)) {
        return;
      }
      const category = categoryFromSettings || resolveEndpointCategory({ firstUsage, metadata, settings: deviceSettings });
      if (!category) {
        this.warn(`Unsupported firstUsage="${firstUsage}" for endpoint with deviceId="${deviceId}"`);
        this.debug({ endpoint });
        return;
      }
      if (includedCategories.length && !stringIncludes(includedCategories, category)) {
        return;
      }
      if (excludedCategories.length && stringIncludes(excludedCategories, category)) {
        return;
      }
      if (!this.devicesInCategories.has(uniqueId)) {
        this.logger(`Adding new device with firstUsage=${firstUsage}, deviceId=${deviceId} and endpointId=${endpointId}`);
        const accessoryId = this.getAccessoryId(deviceId, endpointId);
        const nameFromSetting = get(settings, `${deviceId}.name`) as string | undefined;
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
          manufacturer: "Delta Dore",
          serialNumber: `ID${deviceId}`,
          // model: 'N/A',
          state: {}
        };
        this.devices.set(uniqueId, context);
        this.emit("device", context);
      }
    });
  }
  async refresh(): Promise<unknown> {
    this.debug("Refreshing Tydom controller ...");
    return await this.apiClient.post("/refresh/all");
  }

  private debug(...args: any[]) {
    if (this.config.debug) {
      this.logger("[DEBUG]", args);
    }
  }

  private warn(...args: any[]) {
    if (this.config.debug) {
      this.logger("[WARN]", args);
    }
  }

  public getDevicesForCategory(category: Categories): (TydomAccessoryContext<UnknownObject, UnknownObject> | undefined)[] {
    const items = [];
    for (const entry of this.devicesInCategories.entries()) {
      if (entry[1] === category) {
        items.push(entry[0]);
      }
    }

    return items.map(id => this.devices.get(id));
  }
}
