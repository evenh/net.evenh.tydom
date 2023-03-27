/* eslint-disable no-use-before-define */
type UnknownObject = Record<string, unknown>;

export type TydomAccessoryContext<T extends UnknownObject = UnknownObject, U extends UnknownObject = UnknownObject> = {
  accessoryId: string;
  category: Categories;
  deviceId: number;
  endpointId: number;
  group?: TydomConfigGroup;
  manufacturer?: string;
  metadata: TydomMetaElement[];
  model?: string;
  name: string;
  serialNumber?: string;
  settings: T;
  state: U;
};

export type TydomAccessoryUpdateContext = Pick<
  TydomAccessoryContext,
  "category" | "deviceId" | "endpointId" | "accessoryId"
>;

export type TydomDeviceDataUpdateBody = {
  id: number;
  endpoints: {id: number; error: number; data: Record<string, unknown>[]; cdata: Record<string, unknown>[]}[];
}[];

export type TydomMetaElement = {
  enum_values?: string[];
  max?: number;
  min?: number;
  name: string;
  permission: "r" | "w" | "rw";
  step?: number;
  type: "boolean" | "string" | "numeric";
  unit?: "boolean" | "%";
};

export type TydomConfigGroup = {
  picto: string;
  name: string;
  group_all: boolean;
  usage: string;
  id: number;
};

export type ControllerUpdatePayload = {
  type: TydomAccessoryUpdateType;
  category: Categories;
  updates: Record<string, unknown>[];
  context: TydomAccessoryContext;
};

export type TydomAccessoryUpdateType = "data" | "cdata";

// TODO: Fix this type
export const enum Categories {
  // noinspection JSUnusedGlobalSymbols
  OTHER = 1,
  BRIDGE = 2,
  FAN = 3,
  GARAGE_DOOR_OPENER = 4,
  LIGHTBULB = 5,
  DOOR_LOCK = 6,
  OUTLET = 7,
  SWITCH = 8,
  THERMOSTAT = 9,
  SENSOR = 10,
  ALARM_SYSTEM = 11,
  SECURITY_SYSTEM = 11, // Added to conform to HAP naming
  DOOR = 12,
  WINDOW = 13,
  WINDOW_COVERING = 14,
  PROGRAMMABLE_SWITCH = 15,
  RANGE_EXTENDER = 16,
  CAMERA = 17,
  IP_CAMERA = 17, // Added to conform to HAP naming
  VIDEO_DOORBELL = 18,
  AIR_PURIFIER = 19,
  AIR_HEATER = 20,
  AIR_CONDITIONER = 21,
  AIR_HUMIDIFIER = 22,
  AIR_DEHUMIDIFIER = 23,
  APPLE_TV = 24,
  HOMEPOD = 25,
  SPEAKER = 26,
  AIRPORT = 27,
  SPRINKLER = 28,
  FAUCET = 29,
  SHOWER_HEAD = 30,
  TELEVISION = 31,
  TARGET_CONTROLLER = 32, // Remote Control
  ROUTER = 33,
  AUDIO_RECEIVER = 34,
  TV_SET_TOP_BOX = 35,
  TV_STREAMING_STICK = 36,
}
