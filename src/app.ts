import {EventEmitter} from 'events';
import Client from './client';
import * as base64js from 'base64-js';

let instance: App;

enum AppEvents {
  CacheLoad = 'CACHELOAD',
  CacheLoaded = 'CACHELOADED',
  AppCacheLoad = 'APPCACHELOAD',
  AppCacheLoaded = 'APPCACHELOADED',
  Boot = 'BOOT',
  Booted = 'BOOTED'
}

const renderTemplate = (template: string) => {
  return Function('return `' + template.replace('\\', '\\\\') + '`')();
}

export default class App extends EventEmitter {

  public static EVENTS = AppEvents;
  private static _cacheDataUrlMap: { [path:string] : string } = {};

  public static get instance(): App {
    if (!instance) {
      instance = new App();
    }
    return instance;
  }

  public static getCacheDataURL(cache: any, path: string, decode: boolean = true): string {
    let data = Client.getCacheData(cache, path, decode);
    if (typeof data == 'string') {
      data = new Blob([data]);
    }
    const dataUrlMap = this._cacheDataUrlMap;
    return dataUrlMap[path] ? dataUrlMap[path] : (dataUrlMap[path] = window.URL.createObjectURL(data));
  }

  public static init(appCache: any, cache: any = null, client: Client = null): void {
    const app = this.instance;
    app.loadAppCache(appCache, client);
    if (cache) {
      app.loadCache(cache, client);
    }
  }

  private _cache: any;
  private _appCache: any;
  private _isAppCacheLoaded: boolean;
  private _isCacheLoaded: boolean;
  private _isBooted: boolean;

  public get cache() {
    if (!this._cache) {
      throw Error('Cache not loaded!');
    }
    return this._cache;
  }

  public get appCache() {
    if (!this._appCache) {
      throw Error('AppCache not loaded!');
    }
    return this._appCache;
  }

  public get isAppCacheLoaded() {
    return this._isAppCacheLoaded;
  }

  public get isCacheLoaded() {
    return this._isCacheLoaded;
  }

  public get isBooted() {
    return this._isBooted;
  }

  private constructor() {
    super();

    // initialize variables
    this._cache = null;
    this._appCache = null;
    this._isAppCacheLoaded = false;
    this._isCacheLoaded = false;
    this._isBooted = false;

    // handle internal events
    this.on(App.EVENTS.CacheLoaded, () => { this._isCacheLoaded = true; });
    this.on(App.EVENTS.AppCacheLoaded, () => { this._isAppCacheLoaded = true; this._boot(); });
    this.on(App.EVENTS.Booted, () => { this._isBooted = true; });
  }

  public async loadCache(cache: any, client: Client) {
    this.emit(App.EVENTS.CacheLoad);

    // load cache from URL
    if (typeof cache == 'string') {
      this._cache = await client.getByURL(cache);
    }
    // load cache by value
    else if (typeof cache == 'object') {
      this._cache = cache;
    }
    // invalid
    else {
      throw Error('Invalid cache!');
    }

    this.emit(App.EVENTS.CacheLoaded);
  }

  public getCacheData(path: string, decode: boolean = true): string | Blob {
    return Client.getCacheData(this.cache, path, decode);
  }

  public getCacheDataURL(path: string, decode: boolean = true): string {
    return App.getCacheDataURL(this.cache, path, decode);
  }

  public async loadAppCache(cache: any, client: Client) {
    this.emit(App.EVENTS.AppCacheLoad);

    // load cache from URL
    if (typeof cache == 'string') {
      this._appCache = await client.getByURL(cache);
    }
    // load cache by value
    else if (typeof cache == 'object') {
      this._appCache = cache;
    }
    // invalid
    else {
      throw Error('Invalid cache!');
    }

    this.emit(App.EVENTS.AppCacheLoaded);
  }

  public getAppCacheData(path: string, decode: boolean = true): string | Blob {
    return Client.getCacheData(this.appCache, path, decode);
  }

  public getAppCacheDataURL(path: string, decode: boolean = true): string {
    return App.getCacheDataURL(this.appCache, path, decode);
  }

  private _boot() {
    this.emit(App.EVENTS.Boot);

    // acquire the app's entrypoint
    let main = this.getAppCacheData('#/main') as string;

    // resolve resource URLs
    main = renderTemplate(main);

    // load and pass control to app
    const mainURL = window.URL.createObjectURL(new Blob([main], {type: 'text/html'}));
    const appContainer = document.getElementById('app') as HTMLIFrameElement;
    appContainer.src = mainURL;

    // TODO: expose favicon and other icons / manifests to top view?
    // TODO: expose structureddata from #/description for SEO

    this.emit(App.EVENTS.Booted);
  }

}

(window as any).LSW = Object.assign((window as any).LSW || {}, {App});
