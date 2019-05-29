/// <reference path="./globals.ts" />

import Feathers from '@feathersjs/feathers';
import FeathersRestClient from '@feathersjs/rest-client';
import * as feathers from '@feathersjs/feathers';
import * as feathersRestClient from '@feathersjs/rest-client';
// import * as request from 'request';
import * as superagent from 'superagent';

export const isValidURL = (x: string) => {
  return ( (typeof(x) == 'string') && (/^lsw:\/\/\w+(@\w*)?\/\w+\/(\w|-)+(\?\w+\=\w+)?$/i.test(x)) );
}

export const getParamsFromURL = (url: string) => {
  if (!url || !isValidURL(url)) {
    throw Error('Invalid url!');
  }

  const [path, queryString] = url.replace(/^lsw:\/\//i, '').split('?');
  const [scopedPartition, keyID, cacheID] = path.split('/');
  const scopedPartitionParts = scopedPartition.split('@');
  const partition = scopedPartitionParts[0];
  const scope = scopedPartitionParts[1] ? scopedPartitionParts[1] : 'PUBLIC';
  const queryParams = !queryString ? {} : queryString.split('&')
                                                     .map(x => x.split('='))
                                                     .reduce((acc: any, [k,v]) => (acc[k] = v, acc), {});
  const r = {
    route: {
      scope,
      partition,
      keyID,
      cacheID
    },
    query: queryParams
  };

  return r;
}

export const getUrlComponents = (url: string) => {
  const params = getParamsFromURL(url);
  const scopedPartition = `${params.route.partition}@${params.route.scope}`;
  const publicKeyID = params.route.keyID;
  const cacheID = params.route.cacheID;
  return {scopedPartition, publicKeyID, cacheID};
}

export default class Client {

  public static decodeDataURL(dataURL: string): Blob {
    let data;

    // ensure this is valrequestClientid Data URL
    if (dataURL.indexOf('data:') != 0) {
      throw Error('Invalid dataURL!');
    }

    // destructure URL components
    const [urlProto, urlData] = dataURL.split(',');
    const [urlProtoMediatype, urlProtoEncoding] = urlProto.substring(4).split(';');

    // data is base64 encoded
    if ( /base64/i.test(urlProtoEncoding) ) {
      data = window.atob(urlData);
    }
    // data is textual
    else {
      data = urlData;
    }

    data = new Blob([data], {type: urlProtoMediatype});

    return data;
  }

  public static getCacheData(cache: any, path: string, decode: boolean = true): string | Blob {
    let data: any = cache['contents'];

    // ensure cache has a contents section
    if (typeof data != 'object') {
      throw Error('Invalid cache!');
    }

    // normalize path
    if (path.indexOf('#/') == 0) {
      path = path.substring(2);
    }

    // reduce data to corresponding path
    const pathParts = path.split('/');
    for (const pathPart of pathParts) {
      data = data[pathPart];
      if (data == undefined) {
        throw Error('Invalid path!');
      }
    }

    // ensure data is a string
    if (typeof data != 'string') {
      data = JSON.stringify(data);
    }

    // data is a Data URL and must be decoded
    if ( (data.indexOf('data:') == 0) && decode ) {
      data = Client.decodeDataURL(data);
    }

    return data;
  }

  public endpoint: string;
  public authToken: string;
  private _restClient: feathers.Application;

  public constructor(endpoint: string, authToken: string) {
    const app = Feathers();
    const restClient = FeathersRestClient(endpoint);
    // const requestClient = request.defaults({});
    app.configure(restClient.superagent(superagent));

    this.endpoint = endpoint;
    this.authToken = authToken;
    this._restClient = app;
  }

  private _executeRequest(serviceUrl: string, method: string, ...args: any[]) {
    // acquire feathers service
    const service = this._restClient.service(serviceUrl) as any;

    // pass on the request
    return service[method](...args);
  }

  public create(scopedPartition: string, publicKeyID: string, cache: any) {
    const serviceUrl = `${scopedPartition}/${publicKeyID}`;
    return this._executeRequest(serviceUrl, 'create', cache);
  }

  public createByURL(url: string, cache: any) {
    const {scopedPartition, publicKeyID} = getUrlComponents(url);
    return this.create(scopedPartition, publicKeyID, cache);
  }

  public find(scopedPartition: string, publicKeyID: string = null) {
    const serviceUrl = publicKeyID ? `${scopedPartition}/${publicKeyID}` : scopedPartition;
    return this._executeRequest(serviceUrl, 'find');
  }

  public findByURL(url: string) {
    const {scopedPartition, publicKeyID} = getUrlComponents(url);
    return this.find(scopedPartition, publicKeyID);
  }

  public get(scopedPartition: string, publicKeyID: string, cacheID: string) {
    const serviceUrl = `${scopedPartition}/${publicKeyID}`;
    return this._executeRequest(serviceUrl, 'get', cacheID);
  }

  public getByURL(url: string) {
    const {scopedPartition, publicKeyID, cacheID} = getUrlComponents(url);
    return this.get(scopedPartition, publicKeyID, cacheID);
  }

  public update(scopedPartition: string, publicKeyID: string, cacheID: string, cache: any) {
    const serviceUrl = `${scopedPartition}/${publicKeyID}`;
    return this._executeRequest(serviceUrl, 'update', cacheID, cache);
  }

  public updateByURL(url: string, cache: any) {
    const {scopedPartition, publicKeyID, cacheID} = getUrlComponents(url);
    return this.update(scopedPartition, publicKeyID, cacheID, cache);
  }

  public remove(scopedPartition: string, publicKeyID: string, cacheID: string) {
    const serviceUrl = `${scopedPartition}/${publicKeyID}`;
    return this._executeRequest(serviceUrl, 'remove', cacheID);
  }

  public removeByURL(url: string) {
    const {scopedPartition, publicKeyID, cacheID} = getUrlComponents(url);
    return this.remove(scopedPartition, publicKeyID, cacheID);
  }

  public patch(scopedPartition: string, publicKeyID: string, cacheID: string, patchCache: any) {
    const serviceUrl = `${scopedPartition}/${publicKeyID}`;
    return this._executeRequest(serviceUrl, 'patch', cacheID, patchCache);
  }

  public patchByURL(url: string, patchCache: any) {
    const {scopedPartition, publicKeyID, cacheID} = getUrlComponents(url);
    return this.patch(scopedPartition, publicKeyID, cacheID, patchCache);
  }

}

(window as any).LSW = Object.assign((window as any).LSW || {}, {Client});
