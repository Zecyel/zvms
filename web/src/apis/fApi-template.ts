import { toasts } from "@/utils/dialogs";
import { useInfoStore, useLoadingStore } from "@/stores";
import { type AxiosResponse } from "axios";
import axios, { currentToken, setCurrentToken } from "@/plugins/axios";
import * as structs from "./types/structs";
import * as enums from "./types/enums";

function toURLSearchParams(
  kwargs?: any //Record<string, number | string | undefined>
): string {
  if (!kwargs) return "";
  const params: Record<string, string> = {};
  for (const k in kwargs) {
    const v = kwargs[k];
    if (v !== undefined && v !== null) {
      params[k] = v.toString();
    }
  }
  return new URLSearchParams(params).toString();
}

interface ForegroundApiConfig {
  beforeReq(info: ReqInfo): void;
  errorReq(e: Error, info: ReqInfo): void;

  successedRes(res: AxiosResponse<any>, info: ReqInfo): void;
  failedRes(res: AxiosResponse<any> | undefined, info: ReqInfo): void;

  afterProcess(info: ReqInfo): void;
  errorProcess(e: Error, info: ReqInfo): void;

  cleanup(info: ReqInfo): void;

  defaultFailedToast: boolean;
  defaultOkToast: boolean;
}

interface ReqInfo {
  url: string;
  method: MethodType;
  id: number;
}

let _reqId = 0;

export type MethodType = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ForegroundApiProcessor<R extends any> = (
  result: R
) => Promise<void> | void;
export type ForegroundApiRunner<R extends any> = (
  processor?: ForegroundApiProcessor<R>
) => Promise<void>;
export function createForegroundApiRunner<T extends any[], R extends any>(
  fApi: ForegroundApi,
  method: MethodType,
  url: string,
  ...args: T
): ForegroundApiRunner<R> {
  const config = fApi.config;

  const info = {
    url,
    method,
    id: _reqId++,
  };

  const methods = {
    POST: axios.post,
    GET: axios.get,
    DELETE: axios.delete,
    PUT: axios.put,
    PATCH: axios.patch,
  } as const;

  const func = methods[method];
  if (!func) {
    config.errorReq(new Error(`Method ${method} is not supported`), info);
  }

  return async (processor: ForegroundApiProcessor<R> = () => {}) => {
    config.beforeReq(info);
    try {
      let res;
      try {
        if(currentToken===""){
          setCurrentToken(useInfoStore().token)
        }
        res = await func(url, ...args); //axios
      } catch (e: any) {
        if (config.defaultFailedToast) {
          if (e?.code === "ERR_NETWORK") {
            toasts.error("服务器内部错误！");
          } else {
            toasts.error((e as Error).message);
          }
        }
        config.errorReq(e as Error, info);
        throw e;
      }

      if (res?.data?.type !== "SUCCESS") {
        config.failedRes(res, info);
        if (config.defaultFailedToast) {
          toasts.error(res?.data?.message);
        }
      } else {
        const { message, result } = res?.data;
        config.successedRes(res, info);
        try {
          await processor(result);
          if (config.defaultOkToast) {
            toasts.success(message);
          }
          config.afterProcess(info);
        } catch (e) {
          config.errorProcess(e as Error, info);
        }
        config.afterProcess(info);
      }
    } finally {
      config.cleanup(info);
    }
  };
}

export class ForegroundApi {
  config: ForegroundApiConfig;

  constructor(config: ForegroundApiConfig) {
    this.config = config;
  }

  get skipOkToast(): ForegroundApi {
    return new ForegroundApi({
      ...this.config,
      defaultOkToast: false,
    });
  }

  get skipFailedToast(): ForegroundApi {
    return new ForegroundApi({
      ...this.config,
      defaultFailedToast: false,
    });
  }

  get loadingState(): ForegroundApi {
    const oldConfig: ForegroundApiConfig = this.config;
    return new ForegroundApi({
      ...oldConfig,
      beforeReq(info) {
        oldConfig.beforeReq(info);
        useLoadingStore().incLoading();
      },
      cleanup(info) {
        oldConfig.cleanup(info);
        useLoadingStore().decLoading();
      },
    });
  }

  setFailedRes(onFailedRes:(res: AxiosResponse<any> | undefined, info: ReqInfo)=>void){
    return new ForegroundApi({
      ...this.config,
      failedRes:onFailedRes
    });
  }

  //--METHODS START----
  //${METHODS}
  //--METHODS END----
}

export const fApiNotLoading = new ForegroundApi({
  beforeReq(info: ReqInfo) {},
  errorReq(e: Error, info: ReqInfo) {},

  successedRes(res: AxiosResponse<any>, info: ReqInfo) {},
  failedRes(res: AxiosResponse<any> | undefined, info: ReqInfo) {},

  afterProcess(info: ReqInfo) {},
  errorProcess(e: Error, info: ReqInfo) {},

  cleanup(info: ReqInfo) {},

  defaultFailedToast: true,
  defaultOkToast: true,
});

export const fApi = fApiNotLoading.loadingState;
